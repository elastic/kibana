/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { timeRangeRT, routeTimingMetadataRT } from '../../shared';
import {
  logEntryAnomalyRT,
  logEntryAnomalyDatasetsRT,
  anomaliesSortRT,
  paginationRT,
  paginationCursorRT,
} from '../../../log_analysis';

export const LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH =
  '/api/infra/log_analysis/results/log_entry_anomalies';

export const getLogEntryAnomaliesSuccessReponsePayloadRT = rt.intersection([
  rt.type({
    data: rt.intersection([
      rt.type({
        anomalies: rt.array(logEntryAnomalyRT),
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

export type GetLogEntryAnomaliesSuccessResponsePayload = rt.TypeOf<
  typeof getLogEntryAnomaliesSuccessReponsePayloadRT
>;

export const getLogEntryAnomaliesRequestPayloadRT = rt.type({
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
      sort: anomaliesSortRT,
      // Dataset filters
      datasets: logEntryAnomalyDatasetsRT,
    }),
  ]),
});

export type GetLogEntryAnomaliesRequestPayload = rt.TypeOf<
  typeof getLogEntryAnomaliesRequestPayloadRT
>;
