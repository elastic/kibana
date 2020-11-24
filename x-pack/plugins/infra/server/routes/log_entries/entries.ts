/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createValidationFunction } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ENTRIES_PATH,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../../../common/http_api/log_entries';
import { parseFilterQuery } from '../../utils/serialized_query';
import { LogEntriesParams } from '../../lib/domains/log_entries_domain';

export const initLogEntriesRoute = ({ framework, logEntries }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_PATH,
      validate: { body: createValidationFunction(logEntriesRequestRT) },
    },
    async (requestContext, request, response) => {
      try {
        const payload = request.body;
        const {
          startTimestamp: startTimestamp,
          endTimestamp: endTimestamp,
          sourceId,
          query,
          size,
          columns,
        } = payload;

        let entries;
        let hasMoreBefore;
        let hasMoreAfter;

        if ('center' in payload) {
          ({ entries, hasMoreBefore, hasMoreAfter } = await logEntries.getLogEntriesAround(
            requestContext,
            sourceId,
            {
              startTimestamp,
              endTimestamp,
              query: parseFilterQuery(query),
              center: payload.center,
              size,
            },
            columns
          ));
        } else {
          let cursor: LogEntriesParams['cursor'];
          if ('before' in payload) {
            cursor = { before: payload.before };
          } else if ('after' in payload) {
            cursor = { after: payload.after };
          }

          ({ entries, hasMoreBefore, hasMoreAfter } = await logEntries.getLogEntries(
            requestContext,
            sourceId,
            {
              startTimestamp,
              endTimestamp,
              query: parseFilterQuery(query),
              cursor,
              size,
            },
            columns
          ));
        }

        const hasEntries = entries.length > 0;

        return response.ok({
          body: logEntriesResponseRT.encode({
            data: {
              entries,
              topCursor: hasEntries ? entries[0].cursor : null,
              bottomCursor: hasEntries ? entries[entries.length - 1].cursor : null,
              hasMoreBefore,
              hasMoreAfter,
            },
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
