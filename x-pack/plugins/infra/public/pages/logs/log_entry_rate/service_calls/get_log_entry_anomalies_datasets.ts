/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from '../../../../legacy_singletons';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import {
  getLogEntryAnomaliesDatasetsRequestPayloadRT,
  getLogEntryAnomaliesDatasetsSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH,
} from '../../../../../common/http_api/log_analysis';

export const callGetLogEntryAnomaliesDatasetsAPI = async (
  sourceId: string,
  startTime: number,
  endTime: number
) => {
  const response = await npStart.http.fetch(LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_DATASETS_PATH, {
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
