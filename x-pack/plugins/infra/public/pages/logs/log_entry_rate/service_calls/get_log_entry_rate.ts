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
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
} from '../../../../../common/http_api/log_analysis';
import { createPlainError, throwErrors } from '../../../../../common/runtime_types';

export const callGetLogEntryRateAPI = async (
  sourceId: string,
  startTime: number,
  endTime: number,
  bucketDuration: number,
  datasets?: string[]
) => {
  const response = await npStart.http.fetch(LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryRateRequestPayloadRT.encode({
        data: {
          sourceId,
          timeRange: {
            startTime,
            endTime,
          },
          bucketDuration,
          datasets,
        },
      })
    ),
  });
  return pipe(
    getLogEntryRateSuccessReponsePayloadRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
