/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { buildFilter } from '../../client/utils';
import { CasesTelemetry, CollectTelemetryDataParams, MaxBucketOnCaseAggregation } from '../types';
import { getMaxBucketOnCaseAggregationQuery } from './utils';

export const getPushedTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['pushes']> => {
  const pushFilter = buildFilter({
    filters: ['pushed'],
    field: 'type',
    operator: 'or',
    type: CASE_USER_ACTION_SAVED_OBJECT,
  });

  const res = await savedObjectsClient.find<unknown, MaxBucketOnCaseAggregation>({
    page: 0,
    perPage: 0,
    filter: pushFilter,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    aggs: { ...getMaxBucketOnCaseAggregationQuery(CASE_USER_ACTION_SAVED_OBJECT) },
  });

  const maxOnACase = res.aggregations?.references?.cases?.max?.value ?? 0;

  return {
    all: { total: res.total, maxOnACase },
  };
};
