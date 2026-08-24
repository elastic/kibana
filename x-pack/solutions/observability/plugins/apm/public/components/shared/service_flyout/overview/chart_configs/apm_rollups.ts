/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ApmDocumentType } from '../../../../../../common/document_type';
import type { RollupInterval } from '../../../../../../common/rollup';
import {
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  METRICSET_INTERVAL,
  METRICSET_NAME,
  PROCESSOR_EVENT,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_TYPE,
} from '../../../../../../common/es_fields/apm';
import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import {
  TIME_BUCKET_FIELD,
  TRANSACTION_COUNT_COLUMN,
  applyServiceFilters,
  pipeThroughputPerMinute,
  timeBucketBy,
} from './shared';
import type { EcsServiceScope } from './shared';

export const ROLLUP_LATENCY_COLUMN = 'latency';

export type ApmRollupDocumentType =
  | ApmDocumentType.ServiceTransactionMetric
  | ApmDocumentType.TransactionMetric;

export interface ApmRollupSource {
  documentType: ApmRollupDocumentType;
  rollupInterval: RollupInterval;
  bucketSizeInSeconds: number;
}

const METRICSET_NAME_BY_DOCUMENT_TYPE: Record<ApmRollupDocumentType, string> = {
  [ApmDocumentType.ServiceTransactionMetric]: 'service_transaction',
  [ApmDocumentType.TransactionMetric]: 'transaction',
};

export const isApmRollupDocumentType = (
  documentType: ApmDocumentType
): documentType is ApmRollupDocumentType => documentType in METRICSET_NAME_BY_DOCUMENT_TYPE;

/**
 * The rollups are only queried when they expose `transaction.duration.summary`, so the
 * `getBackwardCompatibleDocumentTypeFilter` variant the server applies to 1m transaction metrics is
 * not needed: deployments holding pre-8.7 documents resolve to a raw transaction source instead.
 */
function createRollupBaseQuery({
  indices,
  scope,
  source,
}: {
  indices: string;
  scope: EcsServiceScope;
  source: ApmRollupSource;
}): ComposerQuery {
  const { documentType, rollupInterval } = source;
  const query = esql.from(indices).where`${esql.col(PROCESSOR_EVENT)} == ${'metric'}`;
  query.where`${esql.col(METRICSET_NAME)} == ${METRICSET_NAME_BY_DOCUMENT_TYPE[documentType]}`;
  query.where`${esql.col(METRICSET_INTERVAL)} == ${rollupInterval}`;
  if (scope.transactionType) {
    query.where`${esql.col(TRANSACTION_TYPE)} == ${scope.transactionType}`;
  }
  applyServiceFilters(query, scope);
  return query;
}

export function buildApmRollupLatencyQuery({
  indices,
  scope,
  source,
  latencyAggregationType,
}: {
  indices: string;
  scope: EcsServiceScope;
  source: ApmRollupSource;
  latencyAggregationType: LatencyAggregationType;
}): ComposerQuery {
  const query = createRollupBaseQuery({ indices, scope, source });
  // Percentiles need the histogram: `transaction.duration.summary` only carries sum and value_count.
  const aggregation =
    latencyAggregationType === LatencyAggregationType.avg
      ? `AVG(${TRANSACTION_DURATION_SUMMARY})`
      : `PERCENTILE(${TRANSACTION_DURATION_HISTOGRAM}::tdigest, ${
          latencyAggregationType === LatencyAggregationType.p99 ? 99 : 95
        })`;

  query.pipe(`STATS duration_us = ${aggregation} BY ${timeBucketBy(source.bucketSizeInSeconds)}`);
  query.pipe(`EVAL ${ROLLUP_LATENCY_COLUMN} = duration_us / 1000`);
  query.pipe(`KEEP ${TIME_BUCKET_FIELD}, ${ROLLUP_LATENCY_COLUMN}`);
  query.pipe(`SORT ${TIME_BUCKET_FIELD}`);
  return query;
}

export function buildApmRollupThroughputQuery({
  indices,
  scope,
  source,
}: {
  indices: string;
  scope: EcsServiceScope;
  source: ApmRollupSource;
}): ComposerQuery {
  const query = createRollupBaseQuery({ indices, scope, source });
  // COUNT over an aggregate_metric_double sums its value_count, so this is the transaction count
  // rather than the number of rollup documents.
  query.pipe(
    `STATS ${TRANSACTION_COUNT_COLUMN} = COUNT(${TRANSACTION_DURATION_SUMMARY}) BY ${timeBucketBy(
      source.bucketSizeInSeconds
    )}`
  );
  pipeThroughputPerMinute(query, source.bucketSizeInSeconds);
  return query;
}

export function buildApmRollupErrorRateQuery({
  indices,
  scope,
  source,
}: {
  indices: string;
  scope: EcsServiceScope;
  source: ApmRollupSource;
}): ComposerQuery {
  const query = createRollupBaseQuery({ indices, scope, source });
  const bucket = timeBucketBy(source.bucketSizeInSeconds);

  if (source.documentType === ApmDocumentType.ServiceTransactionMetric) {
    // service_transaction rollups fold both outcomes into `event.success_count`: its value_count is
    // every transaction with a known outcome and its sum is the successful ones.
    query.pipe(
      `STATS successful = SUM(${EVENT_SUCCESS_COUNT}), all = COUNT(${EVENT_SUCCESS_COUNT}) BY ${bucket}`
    );
    query.pipe(
      'EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(all - successful) / all, NULL)'
    );
  } else {
    // transaction rollups are grouped by outcome instead, so the counts have to be weighted by the
    // number of transactions each document stands for.
    query.pipe(
      `STATS failure = COUNT(${TRANSACTION_DURATION_SUMMARY}) WHERE TO_STRING(${EVENT_OUTCOME}) == "failure", all = COUNT(${TRANSACTION_DURATION_SUMMARY}) WHERE (TO_STRING(${EVENT_OUTCOME}) IN ("failure", "success")) BY ${bucket}`
    );
    query.pipe('EVAL failed_transaction_rate = CASE(all > 0, TO_DOUBLE(failure) / all, NULL)');
  }

  query.pipe(`KEEP ${TIME_BUCKET_FIELD}, failed_transaction_rate`);
  query.pipe(`SORT ${TIME_BUCKET_FIELD}`);
  return query;
}
