/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { esql } from '@elastic/esql';
import {
  AT_TIMESTAMP,
  ERROR_GROUP_ID,
  ERROR_ID,
  EXCEPTION_MESSAGE,
  EXCEPTION_TYPE,
  OTEL_EVENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
  TRACE_ID,
  TRANSACTION_DURATION,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';

export type IndexType = 'traces' | 'error';

const INDEX_CONFIG_MAP: Record<IndexType, string[]> = {
  traces: ['span', 'transaction'],
  error: ['error'],
};

/**
 * Discriminated union for where the Discover ES|QL FROM pattern comes from.
 *
 * - APM index types ('traces' | 'error') resolve via apmIndexSettings.
 * - 'logs' callers supply the pattern directly (from useLogsIndexPattern) because
 *   the log-sources pattern is independent of apmIndexSettings and must not be gated
 *   on its fetch status.
 */
export type DiscoverIndexSource =
  | { indexType: IndexType; indexPattern?: never }
  | { indexType: 'logs'; indexPattern: string | undefined };

export interface ESQLQueryParams {
  kuery?: string;
  serviceName?: string;
  environment?: string;
  transactionName?: string;
  transactionType?: string;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  dependencyName?: string;
  spanName?: string;
  spanId?: string;
  traceId?: string;
  errorGroupId?: string;
  errorId?: string;
  sortDirection?: 'ASC' | 'DESC';
  /**
   * When true, appends a KQL WHERE clause that matches unprocessed OTel exception logs:
   * event_name == "exception" OR exception.type exists, AND not processor.event exists.
   * Use for log-source links — never for APM index types.
   */
  exceptionsOnly?: boolean;
  /**
   * When provided alongside exceptionsOnly, further narrows the query to a single
   * exception document by its message field. Omit to match all exceptions for the
   * trace+span scope.
   */
  exceptionMessage?: string;
}

/**
 * Matches unprocessed OTel exception logs.
 *
 * Uses OTEL_EVENT_NAME ('event_name', the flattened field), NOT EVENT_NAME ('event.name') which
 * is for the OTel-native data stream and would produce no results in generic log streams.
 * The two discriminators are ORed so a doc that merely has exception.type but no event_name
 * still matches (some SDKs omit the discriminator field).
 * `not processor.event : *` mirrors the server-side `must_not exists processor.event` filter.
 *
 * Expressed as KQL rather than ES|QL column comparisons because these fields are not mapped in
 * every data stream covered by the log-sources pattern. An unresolvable ES|QL column aborts the
 * whole query, whereas KQL on an unmapped field simply matches nothing.
 */
const UNPROCESSED_OTEL_EXCEPTION_KQL = `(${OTEL_EVENT_NAME} : "exception" or ${EXCEPTION_TYPE} : *) and not ${PROCESSOR_EVENT} : *`;

/**
 * Resolves the APM FROM index pattern from apmIndexSettings.
 * Returns null when indexSettings is empty (the fetch is still loading or failed).
 */
export const getApmIndexPattern = ({
  indexType,
  indexSettings,
}: {
  indexType: IndexType;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}): string | null => {
  if (!indexSettings || indexSettings.length === 0) return null;

  const configNames = INDEX_CONFIG_MAP[indexType];

  const indices = indexSettings
    .filter((setting) => configNames.includes(setting.configurationName))
    .map((setting) => setting.savedValue ?? setting.defaultValue);

  return Array.from(new Set(indices)).join(',');
};

/**
 * Builds an ES|QL query string against an already-resolved index pattern.
 * Callers that own the pattern (e.g. the logs path) use this directly.
 */
export const getESQLQueryFromIndexPattern = ({
  indexPattern,
  params,
}: {
  indexPattern: string;
  params: ESQLQueryParams;
}): string => {
  const {
    kuery,
    serviceName,
    environment,
    transactionName,
    transactionType,
    sampleRangeFrom,
    sampleRangeTo,
    dependencyName,
    spanName,
    spanId,
    traceId,
    errorGroupId,
    errorId,
    sortDirection,
    exceptionsOnly,
    exceptionMessage,
  } = params;

  let query = esql.from(indexPattern);

  if (errorGroupId) {
    query = query.where`${esql.col(ERROR_GROUP_ID)} == ${errorGroupId}`;
  }

  if (errorId) {
    query = query.where`${esql.col(ERROR_ID)} == ${errorId}`;
  }

  if (serviceName) {
    query = query.where`${esql.col(SERVICE_NAME)} == ${serviceName}`;
  }

  if (transactionName) {
    query = query.where`${esql.col(TRANSACTION_NAME)} == ${transactionName}`;
  } else if (spanName) {
    query = query.where`${esql.col(SPAN_NAME)} == ${spanName}`;
  }

  if (transactionType) {
    query = query.where`${esql.col(TRANSACTION_TYPE)} == ${transactionType}`;
  }

  if (
    environment &&
    environment !== ENVIRONMENT_ALL_VALUE &&
    environment !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    query = query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${environment}`;
  }

  if (dependencyName) {
    query = query.where`${esql.col(SPAN_DESTINATION_SERVICE_RESOURCE)} == ${dependencyName}`;
  }

  if (spanId) {
    query = query.where`${esql.col(SPAN_ID)} == ${spanId}`;
  }

  if (traceId) {
    query = query.where`${esql.col(TRACE_ID)} == ${traceId}`;
  }

  if (sampleRangeFrom && sampleRangeTo) {
    const durationField = transactionName ? TRANSACTION_DURATION : SPAN_DURATION;
    query = query.where`${esql.col(durationField)} >= ${sampleRangeFrom} AND ${esql.col(
      durationField
    )} <= ${sampleRangeTo}`;
  }

  if (exceptionMessage) {
    query = query.where`${esql.col(EXCEPTION_MESSAGE)} == ${exceptionMessage}`;
  }

  if (exceptionsOnly) {
    query = query.pipe`WHERE KQL(${UNPROCESSED_OTEL_EXCEPTION_KQL})`;
  }

  if (kuery) {
    query = query.pipe`WHERE KQL(${kuery})`;
  }

  if (sortDirection) {
    query = query.sort([AT_TIMESTAMP, sortDirection]);
  }

  return query.print();
};

/**
 * Builds an ES|QL query from APM index settings. The indexType is used to resolve the
 * FROM pattern via INDEX_CONFIG_MAP; returns null when indexSettings is empty.
 *
 * For log-source queries use getESQLQueryFromIndexPattern directly with the pattern from
 * useLogsIndexPattern().
 */
export const getESQLQuery = ({
  indexType,
  params,
  indexSettings,
}: {
  indexType: IndexType;
  params: ESQLQueryParams;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}): string | null => {
  const indexPattern = getApmIndexPattern({ indexType, indexSettings });
  if (!indexPattern) return null;
  return getESQLQueryFromIndexPattern({ indexPattern, params });
};
