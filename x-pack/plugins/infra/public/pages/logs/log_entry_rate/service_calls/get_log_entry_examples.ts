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
  getLogEntryExamplesRequestPayloadRT,
  getLogEntryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH,
} from '../../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

interface RequestArgs {
  sourceId: string;
  startTime: number;
  endTime: number;
  dataset: string;
  exampleCount: number;
  categoryId?: string;
}

export const callGetLogEntryExamplesAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpSetup['fetch']
) => {
  const { sourceId, startTime, endTime, dataset, exampleCount, categoryId } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_RATE_EXAMPLES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryExamplesRequestPayloadRT.encode({
        data: {
          dataset,
          exampleCount,
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
          categoryId,
        },
      })
    ),
  });

  return pipe(
    getLogEntryExamplesSuccessReponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
