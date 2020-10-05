/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpHandler } from 'src/core/public';
import {
  getLogEntryAnomaliesRequestPayloadRT,
  getLogEntryAnomaliesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { Sort, Pagination } from '../../../../../common/http_api/log_analysis';

interface RequestArgs {
  sourceId: string;
  startTime: number;
  endTime: number;
  sort: Sort;
  pagination: Pagination;
  datasets?: string[];
}

export const callGetLogEntryAnomaliesAPI = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const { sourceId, startTime, endTime, sort, pagination, datasets } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryAnomaliesRequestPayloadRT.encode({
        data: {
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
          sort,
          pagination,
          datasets,
        },
      })
    ),
  });

  return decodeOrThrow(getLogEntryAnomaliesSuccessReponsePayloadRT)(response);
};
