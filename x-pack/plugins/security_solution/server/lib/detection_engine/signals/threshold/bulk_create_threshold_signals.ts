/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import set from 'set-value';
import {
  ThresholdNormalized,
  TimestampOverrideOrUndefined,
} from '../../../../../common/detection_engine/schemas/common/schemas';
import { Logger, SavedObject } from '../../../../../../../../src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerting/server';
import { BaseHit } from '../../../../../common/detection_engine/types';
import { TermAggregationBucket } from '../../../types';
import { RefreshTypes } from '../../types';
import { singleBulkCreate, SingleBulkCreateResponse } from '../single_bulk_create';
import {
  calculateThresholdSignalUuid,
  getThresholdAggregationParts,
  getThresholdTermsHash,
} from '../utils';
import { BuildRuleMessage } from '../rule_messages';
import type {
  MultiAggBucket,
  SignalSource,
  SignalSearchResponse,
  ThresholdSignalHistory,
  AlertAttributes,
} from '../types';
import { ThresholdRuleParams } from '../../schemas/rule_schemas';

interface BulkCreateThresholdSignalsParams {
  someResult: SignalSearchResponse;
  ruleSO: SavedObject<AlertAttributes<ThresholdRuleParams>>;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  logger: Logger;
  id: string;
  filter: unknown;
  signalsIndex: string;
  refresh: RefreshTypes;
  startedAt: Date;
  from: Date;
  thresholdSignalHistory: ThresholdSignalHistory;
  buildRuleMessage: BuildRuleMessage;
}

const getTransformedHits = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  from: Date,
  logger: Logger,
  threshold: ThresholdNormalized,
  ruleId: string,
  filter: unknown,
  timestampOverride: TimestampOverrideOrUndefined,
  thresholdSignalHistory: ThresholdSignalHistory
) => {
  const aggParts = threshold.field.length
    ? results.aggregations && getThresholdAggregationParts(results.aggregations)
    : {
        field: null,
        index: 0,
        name: 'threshold_0',
      };

  if (!aggParts) {
    return [];
  }

  const getCombinations = (buckets: TermAggregationBucket[], i: number, field: string) => {
    return buckets.reduce((acc: MultiAggBucket[], bucket: TermAggregationBucket) => {
      if (i < threshold.field.length - 1) {
        const nextLevelIdx = i + 1;
        const nextLevelAggParts = getThresholdAggregationParts(bucket, nextLevelIdx);
        if (nextLevelAggParts == null) {
          throw new Error('Unable to parse aggregation.');
        }
        const nextLevelPath = `['${nextLevelAggParts.name}']['buckets']`;
        const nextBuckets = get(nextLevelPath, bucket);
        const combinations = getCombinations(nextBuckets, nextLevelIdx, nextLevelAggParts.field);
        combinations.forEach((val) => {
          const el = {
            terms: [
              {
                field,
                value: bucket.key,
              },
              ...val.terms,
            ].filter((term) => term.field != null),
            cardinality: val.cardinality,
            topThresholdHits: val.topThresholdHits,
            docCount: val.docCount,
          };
          acc.push(el);
        });
      } else {
        const el = {
          terms: [
            {
              field,
              value: bucket.key,
            },
          ].filter((term) => term.field != null),
          cardinality: threshold.cardinality?.length
            ? [
                {
                  field: threshold.cardinality[0].field,
                  value: bucket.cardinality_count!.value,
                },
              ]
            : undefined,
          topThresholdHits: bucket.top_threshold_hits,
          docCount: bucket.doc_count,
        };
        acc.push(el);
      }

      return acc;
    }, []);
  };

  // Recurse through the nested buckets and collect each unique combination of terms. Collect the
  // cardinality and document count from the leaf buckets and return a signal for each set of terms.
  // @ts-expect-error @elastic/elasticsearch no way to declare a type for aggregation in the search response
  return getCombinations(results.aggregations![aggParts.name].buckets, 0, aggParts.field).reduce(
    (acc: Array<BaseHit<SignalSource>>, bucket) => {
      const hit = bucket.topThresholdHits?.hits.hits[0];
      if (hit == null) {
        return acc;
      }

      const timestampArray = get(timestampOverride ?? '@timestamp', hit.fields);
      if (timestampArray == null) {
        return acc;
      }

      const timestamp = timestampArray[0];
      if (typeof timestamp !== 'string') {
        return acc;
      }

      const termsHash = getThresholdTermsHash(bucket.terms);
      const signalHit = thresholdSignalHistory[termsHash];

      const source = {
        '@timestamp': timestamp,
        ...bucket.terms.reduce<object>((termAcc, term) => {
          if (!term.field.startsWith('signal.')) {
            return {
              ...termAcc,
              [term.field]: term.value,
            };
          }
          return termAcc;
        }, {}),
        threshold_result: {
          terms: bucket.terms,
          cardinality: bucket.cardinality,
          count: bucket.docCount,
          // Store `from` in the signal so that we know the lower bound for the
          // threshold set in the timeline search. The upper bound will always be
          // the `original_time` of the signal (the timestamp of the latest event
          // in the set).
          from:
            signalHit?.lastSignalTimestamp != null
              ? new Date(signalHit!.lastSignalTimestamp)
              : from,
        },
      };

      acc.push({
        _index: inputIndex,
        _id: calculateThresholdSignalUuid(
          ruleId,
          startedAt,
          threshold.field,
          bucket.terms
            .map((term) => term.value)
            .sort()
            .join(',')
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
  from: Date,
  filter: unknown,
  logger: Logger,
  threshold: ThresholdNormalized,
  ruleId: string,
  timestampOverride: TimestampOverrideOrUndefined,
  thresholdSignalHistory: ThresholdSignalHistory
): SignalSearchResponse => {
  const transformedHits = getTransformedHits(
    results,
    inputIndex,
    startedAt,
    from,
    logger,
    threshold,
    ruleId,
    filter,
    timestampOverride,
    thresholdSignalHistory
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
  const ruleParams = params.ruleSO.attributes.params;
  const thresholdResults = params.someResult;
  const ecsResults = transformThresholdResultsToEcs(
    thresholdResults,
    params.inputIndexPattern.join(','),
    params.startedAt,
    params.from,
    params.filter,
    params.logger,
    ruleParams.threshold,
    ruleParams.ruleId,
    ruleParams.timestampOverride,
    params.thresholdSignalHistory
  );
  const buildRuleMessage = params.buildRuleMessage;

  return singleBulkCreate({ ...params, filteredEvents: ecsResults, buildRuleMessage });
};
