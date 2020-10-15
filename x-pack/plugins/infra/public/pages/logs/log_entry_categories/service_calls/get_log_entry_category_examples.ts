/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { HttpHandler } from 'src/core/public';

import {
  getLogEntryCategoryExamplesRequestPayloadRT,
  getLogEntryCategoryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs {
  sourceId: string;
  startTime: number;
  endTime: number;
  categoryId: number;
  exampleCount: number;
}

export const callGetLogEntryCategoryExamplesAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpHandler
) => {
  const { sourceId, startTime, endTime, categoryId, exampleCount } = requestArgs;

  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryCategoryExamplesRequestPayloadRT.encode({
        data: {
          categoryId,
          exampleCount,
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
        },
      })
    ),
  });

  return decodeOrThrow(getLogEntryCategoryExamplesSuccessReponsePayloadRT)(response);
};
