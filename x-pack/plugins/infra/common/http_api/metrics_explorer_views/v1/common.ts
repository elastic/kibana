/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { either } from 'fp-ts/Either';
import { metricsExplorerViewRT } from '../../../metrics_explorer_views';

export const METRICS_EXPLORER_VIEW_URL = '/api/infra/metrics_explorer_views';
export const METRICS_EXPLORER_VIEW_URL_ENTITY =
  `${METRICS_EXPLORER_VIEW_URL}/{metricsExplorerViewId}` as const;
export const getMetricsExplorerViewUrl = (metricsExplorerViewId?: string) =>
  [METRICS_EXPLORER_VIEW_URL, metricsExplorerViewId].filter(Boolean).join('/');

const metricsExplorerViewIdRT = new rt.Type<string, string, unknown>(
  'MetricsExplorerViewId',
  rt.string.is,
  (u, c) =>
    either.chain(rt.string.validate(u, c), (id) => {
      return id === '0'
        ? rt.failure(u, c, `The metrics explorer view with id ${id} is not configurable.`)
        : rt.success(id);
    }),
  String
);

export const metricsExplorerViewRequestParamsRT = rt.type({
  metricsExplorerViewId: metricsExplorerViewIdRT,
});

export const metricsExplorerViewRequestQueryRT = rt.partial({
  sourceId: rt.string,
});

export type MetricsExplorerViewRequestQuery = rt.TypeOf<typeof metricsExplorerViewRequestQueryRT>;

export const metricsExplorerViewResponsePayloadRT = rt.type({
  data: metricsExplorerViewRT,
});
