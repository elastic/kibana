/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { RuleAlertAction } from '../../../../common/detection_engine/types';
import { RuleTypeParams, RefreshTypes } from '../types';
import { singleBulkCreate, SingleBulkCreateResponse } from './single_bulk_create';
import { SignalSearchResponse, ThresholdAggregationBucket } from './types';
import { calculateThresholdSignalUuid } from './utils';
import { BuildRuleMessage } from './rule_messages';

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

    const source = {
      '@timestamp': get(timestampOverride ?? '@timestamp', hit._source),
      threshold_result: {
        count: totalResults,
        value: ruleId,
      },
    };

    return [
      {
        _index: inputIndex,
        _id: calculateThresholdSignalUuid(ruleId, startedAt, threshold.field),
        _source: source,
      },
    ];
  }

  if (!results.aggregations?.threshold) {
    return [];
  }

  return results.aggregations.threshold.buckets
    .map(
      ({ key, doc_count: docCount, top_threshold_hits: topHits }: ThresholdAggregationBucket) => {
        const hit = topHits.hits.hits[0];
        if (hit == null) {
          return null;
        }

        const source = {
          '@timestamp': get(timestampOverride ?? '@timestamp', hit._source),
          threshold_result: {
            count: docCount,
            value: get(threshold.field, hit._source),
          },
        };

        return {
          _index: inputIndex,
          _id: calculateThresholdSignalUuid(ruleId, startedAt, threshold.field, key),
          _source: source,
        };
      }
    )
    .filter((bucket: ThresholdAggregationBucket) => bucket != null);
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

  delete thresholdResults.aggregations; // no longer needed

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
