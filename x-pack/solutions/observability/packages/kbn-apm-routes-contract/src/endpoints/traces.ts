/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
import type { ServerRoute } from '@kbn/server-route-repository-utils';

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});

export const UNIFIED_TRACES_BY_ID_ENDPOINT = 'GET /internal/apm/unified_traces/{traceId}';
export type UnifiedTracesByIdEndpoint = typeof UNIFIED_TRACES_BY_ID_ENDPOINT;
export const unifiedTracesByIdParams = t.type({
  path: t.type({
    traceId: t.string,
  }),
  query: t.intersection([rangeRt, t.partial({ maxTraceItems: toNumberRt, serviceName: t.string })]),
});

export const unifiedTracesByIdRouteContract = {
  [UNIFIED_TRACES_BY_ID_ENDPOINT]: {} as ServerRoute<
    UnifiedTracesByIdEndpoint,
    typeof unifiedTracesByIdParams,
    any,
    any,
    any
  >,
};
