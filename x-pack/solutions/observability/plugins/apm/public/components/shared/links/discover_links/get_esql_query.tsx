/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import { esql } from '@kbn/esql-language';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_DURATION,
  SPAN_ID,
  SPAN_NAME,
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
  errorGroupId?: string;
}

export const getESQLQuery = ({
  indexType,
  params,
  indexSettings,
}: {
  indexType: IndexType;
  params: ESQLQueryParams;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}): string | null => {
  if (!indexSettings || indexSettings?.length === 0) return null;

  const configNames = INDEX_CONFIG_MAP[indexType];

  const indices = indexSettings
    .filter((setting) => configNames.includes(setting.configurationName))
    .map((setting) => setting.savedValue ?? setting.defaultValue);

  const dedupedIndices = Array.from(new Set(indices)).join(',');

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
    errorGroupId,
  } = params;

  let query = esql.from(dedupedIndices);

  if (errorGroupId) {
    query = query.where`${esql.col(ERROR_GROUP_ID)} == ${errorGroupId}`;
  }

  if (serviceName) {
    query = query.where`${esql.col(SERVICE_NAME)} == ${serviceName}`;
  }

  if (spanId) {
    query = query.where`${esql.col(SPAN_ID)} == ${spanId}`;
  }

  if (
    environment &&
    environment !== ENVIRONMENT_ALL_VALUE &&
    environment !== ENVIRONMENT_NOT_DEFINED_VALUE
  ) {
    query = query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${environment}`;
  }

  if (transactionName) {
    query = query.where`${esql.col(TRANSACTION_NAME)} == ${transactionName}`;
  } else if (spanName) {
    query = query.where`${esql.col(SPAN_NAME)} == ${spanName}`;
  }

  if (transactionType) {
    query = query.where`${esql.col(TRANSACTION_TYPE)} == ${transactionType}`;
  }

  if (dependencyName) {
    query = query.where`${esql.col(SPAN_DESTINATION_SERVICE_RESOURCE)} == ${dependencyName}`;
  }

  if (sampleRangeFrom && sampleRangeTo) {
    const durationField = transactionName ? TRANSACTION_DURATION : SPAN_DURATION;
    query = query.where`${esql.col(durationField)} >= ${sampleRangeFrom} AND ${esql.col(
      durationField
    )} <= ${sampleRangeTo}`;
  }

  if (kuery) {
    query = query.pipe`WHERE KQL(${kuery})`;
  }

  return query.print();
};
