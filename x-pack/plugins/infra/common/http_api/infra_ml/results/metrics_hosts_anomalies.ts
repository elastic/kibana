/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { timeRangeRT, routeTimingMetadataRT } from '../../shared';
import { anomalyTypeRT, paginationCursorRT, sortRT, paginationRT, metricRT } from './common';

export const INFA_ML_GET_METRICS_HOSTS_ANOMALIES_PATH =
  '/api/infra/infra_ml/results/metrics_hosts_anomalies';

const metricsHostAnomalyCommonFieldsRT = rt.intersection([
  rt.type({
    id: rt.string,
    anomalyScore: rt.number,
    typical: rt.number,
    actual: rt.number,
    type: anomalyTypeRT,
    influencers: rt.array(rt.string),
    duration: rt.number,
    startTime: rt.number,
    jobId: rt.string,
  }),
  rt.partial({
    partitionFieldName: rt.string,
    partitionFieldValue: rt.string,
  }),
]);
const metricsHostsAnomalyRT = metricsHostAnomalyCommonFieldsRT;

export type MetricsHostsAnomaly = rt.TypeOf<typeof metricsHostsAnomalyRT>;

export const getMetricsHostsAnomaliesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.intersection([
      rt.type({
        anomalies: rt.array(metricsHostsAnomalyRT),
        // Signifies there are more entries backwards or forwards. If this was a request
        // for a previous page, there are more previous pages, if this was a request for a next page,
        // there are more next pages.
        hasMoreEntries: rt.boolean,
      }),
      rt.partial({
        paginationCursors: rt.type({
          // The cursor to use to fetch the previous page
          previousPageCursor: paginationCursorRT,
          // The cursor to use to fetch the next page
          nextPageCursor: paginationCursorRT,
        }),
      }),
    ]),
  }),
  rt.partial({
    timing: routeTimingMetadataRT,
  }),
]);

export type GetMetricsHostsAnomaliesSuccessResponsePayload = rt.TypeOf<
  typeof getMetricsHostsAnomaliesSuccessReponsePayloadRT
>;

export const getMetricsHostsAnomaliesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // the ID of the source configuration
      sourceId: rt.string,
      anomalyThreshold: rt.number,
      // the time range to fetch the log entry anomalies from
      timeRange: timeRangeRT,
    }),
    rt.partial({
      query: rt.string,
      hostName: rt.string,
      metric: metricRT,
      // Pagination properties
      pagination: paginationRT,
      // Sort properties
      sort: sortRT,
    }),
  ]),
});

export type GetMetricsHostsAnomaliesRequestPayload = rt.TypeOf<
  typeof getMetricsHostsAnomaliesRequestPayloadRT
>;
