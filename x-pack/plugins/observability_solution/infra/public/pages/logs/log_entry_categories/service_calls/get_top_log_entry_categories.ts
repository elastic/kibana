/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { IdFormat } from '../../../../../common/http_api/latest';

import {
  getLogEntryCategoriesRequestPayloadRT,
  getLogEntryCategoriesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH,
} from '../../../../../common/http_api';
import { CategoriesSort } from '../../../../../common/log_analysis';

interface RequestArgs {
  logViewReference: PersistedLogViewReference;
  idFormat: IdFormat;
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
  const { logViewReference, idFormat, startTime, endTime, categoryCount, datasets, sort } =
    requestArgs;
  const intervalDuration = endTime - startTime;

  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_CATEGORIES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryCategoriesRequestPayloadRT.encode({
        data: {
          logView: logViewReference,
          idFormat,
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
    version: '1',
  });

  return decodeOrThrow(getLogEntryCategoriesSuccessReponsePayloadRT)(response);
};
