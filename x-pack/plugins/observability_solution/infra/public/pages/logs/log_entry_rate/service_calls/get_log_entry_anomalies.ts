/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { IdFormatByJobType } from '../../../../../common/http_api/latest';
import {
  getLogEntryAnomaliesRequestPayloadRT,
  getLogEntryAnomaliesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH,
} from '../../../../../common/http_api';
import { AnomaliesSort, Pagination } from '../../../../../common/log_analysis';

interface RequestArgs {
  logViewReference: PersistedLogViewReference;
  idFormats: IdFormatByJobType;
  startTime: number;
  endTime: number;
  sort: AnomaliesSort;
  pagination: Pagination;
  datasets?: string[];
}

export const callGetLogEntryAnomaliesAPI = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const { logViewReference, idFormats, startTime, endTime, sort, pagination, datasets } =
    requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryAnomaliesRequestPayloadRT.encode({
        data: {
          logView: logViewReference,
          idFormats,
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
    version: '1',
  });

  return decodeOrThrow(getLogEntryAnomaliesSuccessReponsePayloadRT)(response);
};
