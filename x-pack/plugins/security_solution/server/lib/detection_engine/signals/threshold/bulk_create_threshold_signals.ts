/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCardinalityAggregate,
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
  AggregationsMultiTermsAggregate,
  AggregationsMultiTermsBucket,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TIMESTAMP } from '@kbn/rule-data-utils';

import set from 'set-value';
import { Logger } from '@kbn/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { ThresholdNormalized } from '../../../../../common/detection_engine/schemas/common/schemas';
import { GenericBulkCreateResponse } from '../../rule_types/factories/bulk_create_factory';
import { calculateThresholdSignalUuid } from '../utils';
import { buildReasonMessageForThresholdAlert } from '../reason_formatters';
import type { SignalSearchResponse, ThresholdSignalHistory, BulkCreate, WrapHits } from '../types';
import { CompleteRule, ThresholdRuleParams } from '../../schemas/rule_schemas';
import { BaseFieldsLatest } from '../../../../../common/detection_engine/schemas/alerts';

interface BulkCreateThresholdSignalsParams {
  someResult: SignalSearchResponse;
  completeRule: CompleteRule<ThresholdRuleParams>;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  inputIndexPattern: string[];
  logger: Logger;
  filter: unknown;
  signalsIndex: string;
  startedAt: Date;
  from: Date;
  signalHistory: ThresholdSignalHistory;
  bulkCreate: BulkCreate;
  wrapHits: WrapHits;
}

const getTransformedHits = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
) => {
  if (results.aggregations == null) {
    return [];
  }

  return (
    (results.aggregations.thresholdTerms as AggregationsMultiTermsAggregate)
      .buckets as AggregationsMultiTermsBucket[]
  ).map((bucket, i) => ({
    _index: inputIndex,
    _id: calculateThresholdSignalUuid(
      ruleId,
      startedAt,
      threshold.field,
      Object.keys(bucket.key).sort().join(',')
    ),
    _source: {
      [TIMESTAMP]: (bucket.max_timestamp as AggregationsMaxAggregate).value_as_string,
      ...Object.keys(bucket.key).reduce(
        (acc, val) => ({
          ...acc,
          [val]: bucket.key[val],
        }),
        {}
      ),
      threshold_result: {
        terms: Object.keys(bucket.key).map((term, j) => ({
          field: term,
          value: bucket.key[term],
        })),
        cardinality: {
          field: threshold.cardinality ? threshold.cardinality[0]?.field : undefined,
          value: (bucket.cardinality_count as AggregationsCardinalityAggregate)?.value,
        },
        count: bucket.doc_count,
        from:
          new Date((bucket.min_timestamp as AggregationsMinAggregate).value_as_string as string) ??
          from,
      },
    },
  }));
};

export const transformThresholdResultsToEcs = (
  results: SignalSearchResponse,
  inputIndex: string,
  startedAt: Date,
  from: Date,
  threshold: ThresholdNormalized,
  ruleId: string
): SignalSearchResponse => {
  const transformedHits = getTransformedHits(
    results,
    inputIndex,
    startedAt,
    from,
    threshold,
    ruleId
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
): Promise<GenericBulkCreateResponse<BaseFieldsLatest>> => {
  const ruleParams = params.completeRule.ruleParams;
  const thresholdResults = params.someResult;
  const ecsResults = transformThresholdResultsToEcs(
    thresholdResults,
    params.inputIndexPattern.join(','),
    params.startedAt,
    params.from,
    ruleParams.threshold,
    ruleParams.ruleId
  );

  return params.bulkCreate(
    params.wrapHits(ecsResults.hits.hits, buildReasonMessageForThresholdAlert)
  );
};
