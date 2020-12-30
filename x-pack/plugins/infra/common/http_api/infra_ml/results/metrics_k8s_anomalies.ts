/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { timeRangeRT, routeTimingMetadataRT } from '../../shared';
import { paginationCursorRT, anomalyTypeRT, sortRT, paginationRT, metricRT } from './common';

export const INFA_ML_GET_METRICS_K8S_ANOMALIES_PATH =
  '/api/infra/infra_ml/results/metrics_k8s_anomalies';

const metricsK8sAnomalyCommonFieldsRT = rt.type({
  id: rt.string,
  anomalyScore: rt.number,
  typical: rt.number,
  actual: rt.number,
  type: anomalyTypeRT,
  influencers: rt.array(rt.string),
  duration: rt.number,
  startTime: rt.number,
  jobId: rt.string,
});
const metricsK8sAnomalyRT = metricsK8sAnomalyCommonFieldsRT;

export type MetricsK8sAnomaly = rt.TypeOf<typeof metricsK8sAnomalyRT>;

export const getMetricsK8sAnomaliesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.intersection([
      rt.type({
        anomalies: rt.array(metricsK8sAnomalyRT),
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

export type GetMetricsK8sAnomaliesSuccessResponsePayload = rt.TypeOf<
  typeof getMetricsK8sAnomaliesSuccessReponsePayloadRT
>;

export const getMetricsK8sAnomaliesRequestPayloadRT = rt.type({
  data: rt.intersection([
    rt.type({
      // the ID of the source configuration
      sourceId: rt.string,
      // the time range to fetch the log entry anomalies from
      timeRange: timeRangeRT,
    }),
    rt.partial({
      metric: metricRT,
      // Pagination properties
      pagination: paginationRT,
      // Sort properties
      sort: sortRT,
      // Dataset filters
      datasets: rt.array(rt.string),
    }),
  ]),
});

export type GetMetricsK8sAnomaliesRequestPayload = rt.TypeOf<
  typeof getMetricsK8sAnomaliesRequestPayloadRT
>;
