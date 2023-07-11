/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import {
  getLogEntryAnomaliesDatasetsRequestPayloadRT,
  getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH,
} from '../../../../../common/http_api';

interface RequestArgs {
  logViewReference: PersistedLogViewReference;
  startTime: number;
  endTime: number;
}

export const callGetLogEntryAnomaliesDatasetsAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpHandler
) => {
  const { logViewReference, startTime, endTime } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryAnomaliesDatasetsRequestPayloadRT.encode({
        data: {
          logView: logViewReference,
          timeRange: {
            startTime,
            endTime,
          },
        },
      })
    ),
    version: '1',
  });

  return decodeOrThrow(getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT)(response);
};
