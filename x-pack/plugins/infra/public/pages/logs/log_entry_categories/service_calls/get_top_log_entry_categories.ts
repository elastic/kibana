/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpSetup } from 'src/core/public';

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';

import {
  getLogEntryCategoriesRequestPayloadRT,
  getLogEntryCategoriesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

interface RequestArgs {
  sourceId: string;
  startTime: number;
  endTime: number;
  categoryCount: number;
  datasets?: string[];
}

export const callGetTopLogEntryCategoriesAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpSetup['fetch']
) => {
  const { sourceId, startTime, endTime, categoryCount, datasets } = requestArgs;
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
        },
      })
    ),
  });

  return pipe(
    getLogEntryCategoriesSuccessReponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
