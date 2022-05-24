/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import {
  getLogEntryAnomaliesDatasetsRequestPayloadRT,
  getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH,
} from '../../../../../common/http_api/log_analysis';

interface RequestArgs {
  sourceId: string;
  startTime: number;
  endTime: number;
}

export const callGetLogEntryAnomaliesDatasetsAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpHandler
) => {
  const { sourceId, startTime, endTime } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryAnomaliesDatasetsRequestPayloadRT.encode({
        data: {
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
        },
      })
    ),
  });

  return decodeOrThrow(getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT)(response);
};
