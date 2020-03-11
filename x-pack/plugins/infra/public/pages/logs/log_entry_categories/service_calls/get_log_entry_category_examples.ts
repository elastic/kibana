/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { npStart } from '../../../../legacy_singletons';

import {
  getLogEntryCategoryExamplesRequestPayloadRT,
  getLogEntryCategoryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

export const callGetLogEntryCategoryExamplesAPI = async (
  sourceId: string,
  startTime: number,
  endTime: number,
  categoryId: number,
  exampleCount: number
) => {
  const response = await npStart.http.fetch(LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH, {
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

  return pipe(
    getLogEntryCategoryExamplesSuccessReponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
