/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { IdFormat } from '../../../../../common/http_api/latest';

import {
  getLogEntryCategoryExamplesRequestPayloadRT,
  getLogEntryCategoryExamplesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH,
} from '../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../common/runtime_types';

interface RequestArgs {
  logViewReference: PersistedLogViewReference;
  idFormat: IdFormat;
  startTime: number;
  endTime: number;
  categoryId: number;
  exampleCount: number;
}

export const callGetLogEntryCategoryExamplesAPI = async (
  requestArgs: RequestArgs,
  fetch: HttpHandler
) => {
  const { logViewReference, idFormat, startTime, endTime, categoryId, exampleCount } = requestArgs;

  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORY_EXAMPLES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryCategoryExamplesRequestPayloadRT.encode({
        data: {
          categoryId,
          exampleCount,
          logView: logViewReference,
          idFormat,
          timeRange: {
            startTime,
            endTime,
          },
        },
      })
    ),
    version: '1',
  });

  return decodeOrThrow(getLogEntryCategoryExamplesSuccessReponsePayloadRT)(response);
};
