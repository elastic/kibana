/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ENTRIES_HIGHLIGHTS_PATH,
  logEntriesHighlightsRequestRT,
  logEntriesHighlightsResponseRT,
} from '../../../common/http_api/log_entries';
import { parseFilterQuery } from '../../utils/serialized_query';
import { LogEntriesParams } from '../../lib/domains/log_entries_domain';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initLogEntriesHighlightsRoute = ({ framework, logEntries }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_HIGHLIGHTS_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntriesHighlightsRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { startDate, endDate, sourceId, query, size, highlightTerms } = payload;

        let entriesPerHighlightTerm;

        if ('center' in payload) {
          entriesPerHighlightTerm = await Promise.all(
            highlightTerms.map(highlightTerm =>
              logEntries.getLogEntriesAround__new(requestContext, sourceId, {
                startDate,
                endDate,
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
            highlightTerms.map(highlightTerm =>
              logEntries.getLogEntries(requestContext, sourceId, {
                startDate,
                endDate,
                query: parseFilterQuery(query),
                cursor,
                size,
                highlightTerm,
              })
            )
          );
        }

        return response.ok({
          body: logEntriesHighlightsResponseRT.encode({
            data: entriesPerHighlightTerm.map(entries => ({
              entries,
              topCursor: entries[0].cursor,
              bottomCursor: entries[entries.length - 1].cursor,
            })),
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
