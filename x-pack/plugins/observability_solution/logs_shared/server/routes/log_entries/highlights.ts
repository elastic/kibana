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
import { LogEntriesParams } from '../../lib/domains/log_entries_domain';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initLogEntriesHighlightsRoute = ({ framework, logEntries }: LogsSharedBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logEntriesV1.LOG_ENTRIES_HIGHLIGHTS_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: escapeHatch } },
      },
      async (requestContext, request, response) => {
        const payload = pipe(
          logEntriesV1.logEntriesHighlightsRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { startTimestamp, endTimestamp, logView, query, size, highlightTerms } = payload;

        let entriesPerHighlightTerm;

        if ('center' in payload) {
          entriesPerHighlightTerm = await Promise.all(
            highlightTerms.map((highlightTerm) =>
              logEntries.getLogEntriesAround(requestContext, logView, {
                startTimestamp,
                endTimestamp,
                query: parseFilterQuery(query),
                center: payload.center,
                size,
                highlightTerm,
              })
            )
          );
        } else {
          let cursor: LogEntriesParams['cursor'];
          if ('before' in payload) {
            cursor = { before: payload.before };
          } else if ('after' in payload) {
            cursor = { after: payload.after };
          }

          entriesPerHighlightTerm = await Promise.all(
            highlightTerms.map((highlightTerm) =>
              logEntries.getLogEntries(requestContext, logView, {
                startTimestamp,
                endTimestamp,
                query: parseFilterQuery(query),
                cursor,
                size,
                highlightTerm,
              })
            )
          );
        }

        return response.ok({
          body: logEntriesV1.logEntriesHighlightsResponseRT.encode({
            data: entriesPerHighlightTerm.map(({ entries }) => {
              if (entries.length > 0) {
                return {
                  entries,
                  topCursor: entries[0].cursor,
                  bottomCursor: entries[entries.length - 1].cursor,
                };
              } else {
                return {
                  entries,
                  topCursor: null,
                  bottomCursor: null,
                };
              }
            }),
          }),
        });
      }
    );
};
