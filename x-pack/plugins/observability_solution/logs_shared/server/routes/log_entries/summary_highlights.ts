/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';

import { logEntriesV1 } from '../../../common/http_api';
import { throwErrors } from '../../../common/runtime_types';

import { LogsSharedBackendLibs } from '../../lib/logs_shared_types';

import { parseFilterQuery } from '../../utils/serialized_query';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initLogEntriesSummaryHighlightsRoute = ({
  framework,
  logEntries,
}: LogsSharedBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logEntriesV1.LOG_ENTRIES_SUMMARY_HIGHLIGHTS_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: escapeHatch } },
      },
      async (requestContext, request, response) => {
        const payload = pipe(
          logEntriesV1.logEntriesSummaryHighlightsRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const { logView, startTimestamp, endTimestamp, bucketSize, query, highlightTerms } =
          payload;

        const bucketsPerHighlightTerm = await logEntries.getLogSummaryHighlightBucketsBetween(
          requestContext,
          logView,
          startTimestamp,
          endTimestamp,
          bucketSize,
          highlightTerms,
          parseFilterQuery(query)
        );

        return response.ok({
          body: logEntriesV1.logEntriesSummaryHighlightsResponseRT.encode({
            data: bucketsPerHighlightTerm.map((buckets) => ({
              start: startTimestamp,
              end: endTimestamp,
              buckets,
            })),
          }),
        });
      }
    );
};
