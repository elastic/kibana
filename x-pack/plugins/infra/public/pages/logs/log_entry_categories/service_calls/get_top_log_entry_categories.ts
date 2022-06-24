/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';

import {
  getLogEntryCategoriesRequestPayloadRT,
  getLogEntryCategoriesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { CategoriesSort } from '../../../../../common/log_analysis';
import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs {
  sourceId: string;
  startTime: number;
  endTime: number;
  categoryCount: number;
  datasets?: string[];
  sort: CategoriesSort;
}

export const callGetTopLogEntryCategoriesAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpHandler
) => {
  const { sourceId, startTime, endTime, categoryCount, datasets, sort } = requestArgs;
  const intervalDuration = endTime - startTime;

  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryCategoriesRequestPayloadRT.encode({
        data: {
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
          categoryCount,
          datasets,
          histograms: [
            {
              id: 'history',
              timeRange: {
                startTime: startTime - intervalDuration,
                endTime,
              },
              bucketCount: 10,
            },
            {
              id: 'reference',
              timeRange: {
                startTime: startTime - intervalDuration,
                endTime: startTime,
              },
              bucketCount: 1,
            },
          ],
          sort,
        },
      })
    ),
  });

  return decodeOrThrow(getLogEntryCategoriesSuccessReponsePayloadRT)(response);
};
