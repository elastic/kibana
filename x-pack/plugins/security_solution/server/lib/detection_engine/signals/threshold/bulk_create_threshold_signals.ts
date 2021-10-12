/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMESTAMP } from '@kbn/rule-data-utils';

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
import { GenericBulkCreateResponse } from '../bulk_create_factory';
import {
  calculateThresholdSignalUuid,
  getThresholdAggregationParts,
  getThresholdTermsHash,
} from '../utils';
import { buildReasonMessageForThresholdAlert } from '../reason_formatters';
import type {
  MultiAggBucket,
  SignalSource,
  SignalSearchResponse,
  ThresholdSignalHistory,
  AlertAttributes,
  BulkCreate,
  WrapHits,
} from '../types';
import { ThresholdRuleParams } from '../../schemas/rule_schemas';

interface BulkCreateThresholdSignalsParams {
  someResult: SignalSearchResponse;
  ruleSO: SavedObject<AlertAttributes<ThresholdRuleParams>>;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
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
  logger: Logger,
  threshold: ThresholdNormalized,
  ruleId: string,
  filter: unknown,
  timestampOverride: TimestampOverrideOrUndefined,
  signalHistory: ThresholdSignalHistory
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

  const getCombinations = (buckets: TermAggregationBucket[], i: number, field: string | null) => {
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
            maxTimestamp: val.maxTimestamp,
            docCount: val.docCount,
          };
          acc.push(el as MultiAggBucket);
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
          maxTimestamp: bucket.max_timestamp.value_as_string,
          docCount: bucket.doc_count,
        };
        acc.push(el as MultiAggBucket);
      }

      return acc;
    }, []);
  };

  return getCombinations(
    (results.aggregations![aggParts.name] as { buckets: TermAggregationBucket[] }).buckets,
    0,
    aggParts.field
  ).reduce((acc: Array<BaseHit<SignalSource>>, bucket) => {
    const termsHash = getThresholdTermsHash(bucket.terms);
    const signalHit = signalHistory[termsHash];

    const source = {
      [TIMESTAMP]: bucket.maxTimestamp,
      ...bucket.terms.reduce<object>((termAcc, term) => {
        if (!term.field.startsWith('signal.')) {
          // We don't want to overwrite `signal.*` fields.
          // See: https://github.com/elastic/kibana/issues/83218
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
          signalHit?.lastSignalTimestamp != null ? new Date(signalHit.lastSignalTimestamp) : from,
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
  }, []);
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
  signalHistory: ThresholdSignalHistory
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
    signalHistory
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
): Promise<GenericBulkCreateResponse<{}>> => {
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
    params.signalHistory
  );

  return params.bulkCreate(
    params.wrapHits(ecsResults.hits.hits, buildReasonMessageForThresholdAlert)
  );
};
