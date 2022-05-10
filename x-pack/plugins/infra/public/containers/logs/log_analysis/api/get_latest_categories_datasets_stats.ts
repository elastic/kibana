/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core/public';
import {
  CategorizerStatus,
  getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT,
  getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT,
  LogEntryCategoriesDatasetStats,
  LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH,
} from '../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export type { LogEntryCategoriesDatasetStats };

export const callGetLatestCategoriesDatasetsStatsAPI = async (
  {
    jobIds,
    startTime,
    endTime,
    includeCategorizerStatuses,
  }: {
    jobIds: string[];
    startTime: number;
    endTime: number;
    includeCategorizerStatuses: CategorizerStatus[];
  },
  fetch: HttpHandler
) => {
  const response = await fetch(LOG_ANALYSIS_GET_LATEST_LOG_ENTRY_CATEGORY_DATASETS_STATS_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLatestLogEntryCategoryDatasetsStatsRequestPayloadRT.encode({
        data: {
          jobIds,
          timeRange: { startTime, endTime },
          includeCategorizerStatuses,
        },
      })
    ),
  });

  return decodeOrThrow(getLatestLogEntryCategoryDatasetsStatsSuccessResponsePayloadRT)(response);
};
