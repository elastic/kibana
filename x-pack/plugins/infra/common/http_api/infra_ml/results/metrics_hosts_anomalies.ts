/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

import { timeRangeRT, routeTimingMetadataRT } from '../../shared';
import { anomalyTypeRT, paginationCursorRT, sortRT, paginationRT } from './common';

export const INFA_ML_GET_METRICS_HOSTS_ANOMALIES_PATH =
  '/api/infra/infra_ml/results/metrics_hosts_anomalies';

const metricsHostAnomalyCommonFieldsRT = rt.type({
  id: rt.string,
  anomalyScore: rt.number,
  dataset: rt.string,
  typical: rt.number,
  actual: rt.number,
  type: anomalyTypeRT,
  duration: rt.number,
  startTime: rt.number,
  jobId: rt.string,
});
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
      // the time range to fetch the log entry anomalies from
      timeRange: timeRangeRT,
    }),
    rt.partial({
      // Pagination properties
      pagination: paginationRT,
      // Sort properties
      sort: sortRT,
      // // Dataset filters
      // datasets: rt.array(rt.string),
    }),
  ]),
});

export type GetMetricsHostsAnomaliesRequestPayload = rt.TypeOf<
  typeof getMetricsHostsAnomaliesRequestPayloadRT
>;
