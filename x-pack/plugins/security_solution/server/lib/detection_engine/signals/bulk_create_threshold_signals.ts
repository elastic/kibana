/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEmpty } from 'lodash/fp';
import set from 'set-value';

import {
  Threshold,
  TimestampOverrideOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { Logger } from '../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerts/server';
import { BaseHit, RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { singleBulkCreate, SingleBulkCreateResponse } from './single_bulk_create';
import { calculateThresholdSignalUuid } from './utils';
import { BuildRuleMessage } from './rule_messages';
import { TermAggregationBucket } from '../../types';
import { MultiAggBucket, SignalSearchResponse, SignalSource } from './types';

interface BulkCreateThresholdSignalsParams {
  actions: RuleAlertAction[];
  someResult: SignalSearchResponse;
  ruleParams: RuleTypeParams;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  logger: Logger;
  id: string;
  filter: unknown;
  signalsIndex: string;
  timestampOverride: TimestampOverrideOrUndefined;
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  interval: string;
  enabled: boolean;
  refresh: RefreshTypes;
  tags: string[];
  throttle: string;
  startedAt: Date;
  buildRuleMessage: BuildRuleMessage;
}

const getTransformedHits = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  logger: Logger,
  threshold: Threshold,
  ruleId: string,
  filter: unknown,
  timestampOverride: TimestampOverrideOrUndefined
) => {
  if (isEmpty(threshold.field)) {
    const totalResults =
      typeof results.hits.total === 'number' ? results.hits.total : results.hits.total.value;

    if (totalResults < threshold.value) {
      return [];
    }

    const hit = results.hits.hits[0];
    if (hit == null) {
      logger.warn(`No hits returned, but totalResults >= threshold.value (${threshold.value})`);
      return [];
    }
    const timestampArray = get(timestampOverride ?? '@timestamp', hit.fields);
    if (timestampArray == null) {
      return [];
    }
    const timestamp = timestampArray[0];
    if (typeof timestamp !== 'string') {
      return [];
    }

    const source = {
      '@timestamp': timestamp,
      threshold_result: {
        count: totalResults,
        value: ruleId,
      },
    };

    return [
      {
        _index: inputIndex,
        _id: calculateThresholdSignalUuid(ruleId, startedAt, threshold.field as string[]),
        _source: source,
      },
    ];
  }

  if (!results.aggregations?.threshold_0) {
    return [];
  }

  const getCombinations = (buckets: TermAggregationBucket[], i: number) => {
    return buckets.reduce((acc: MultiAggBucket[], bucket: TermAggregationBucket) => {
      if (i < threshold.field.length - 1) {
        const nextLevelIdx = i + 1;
        const nextLevelPath = `threshold_${nextLevelIdx}.buckets`;
        const nextBuckets = get(nextLevelPath, bucket);
        const combinations = getCombinations(nextBuckets, nextLevelIdx);
        combinations.forEach((val) => {
          const el = {
            terms: [bucket.key, ...val.terms],
            docCount: val.docCount,
            topThresholdHits: val.topThresholdHits,
            cardinalityCount: val.cardinalityCount,
          };
          acc.push(el);
        });
      } else {
        const el = {
          terms: [bucket.key],
          docCount: bucket.doc_count,
          topThresholdHits: bucket.top_threshold_hits,
          cardinalityCount: bucket.cardinality_count?.value,
        };
        acc.push(el);
      }

      return acc;
    }, []);
  };

  return getCombinations(results.aggregations.threshold_0.buckets, 0).reduce(
    (acc: Array<BaseHit<SignalSource>>, bucket) => {
      const hit = bucket.topThresholdHits?.hits.hits[0];
      if (hit == null) {
        return acc;
      }

      const timestampArray = get(timestampOverride ?? '@timestamp', hit.fields);
      if (timestampArray == null) {
        return [];
      }
      const timestamp = timestampArray[0];
      if (typeof timestamp !== 'string') {
        return [];
      }

      const source = {
        '@timestamp': timestamp,
        threshold_result: {
          count: bucket.docCount,
          value: bucket.terms,
          cardinality_count: bucket.cardinalityCount,
        },
      };

      acc.push({
        _index: inputIndex,
        _id: calculateThresholdSignalUuid(
          ruleId,
          startedAt,
          threshold.field as string[],
          bucket.terms.join(',')
        ),
        _source: source,
      });
      return acc;
    },
    []
  );
};

export const transformThresholdResultsToEcs = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  filter: unknown,
  logger: Logger,
  threshold: Threshold,
  ruleId: string,
  timestampOverride: TimestampOverrideOrUndefined
): SignalSearchResponse => {
  const transformedHits = getTransformedHits(
    results,
    inputIndex,
    startedAt,
    logger,
    threshold,
    ruleId,
    filter,
    timestampOverride
  );
  const thresholdResults = {
    ...results,
    hits: {
      ...results.hits,
      hits: transformedHits,
    },
  };

  delete thresholdResults.aggregations; // delete because no longer needed

  set(thresholdResults, 'results.hits.total', transformedHits.length);

  return thresholdResults;
};

export const bulkCreateThresholdSignals = async (
  params: BulkCreateThresholdSignalsParams
): Promise<SingleBulkCreateResponse> => {
  const thresholdResults = params.someResult;
  const ecsResults = transformThresholdResultsToEcs(
    thresholdResults,
    params.inputIndexPattern.join(','),
    params.startedAt,
    params.filter,
    params.logger,
    params.ruleParams.threshold!,
    params.ruleParams.ruleId,
    params.timestampOverride
  );
  const buildRuleMessage = params.buildRuleMessage;

  return singleBulkCreate({ ...params, filteredEvents: ecsResults, buildRuleMessage });
};
