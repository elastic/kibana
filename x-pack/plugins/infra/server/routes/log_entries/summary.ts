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
  LOG_ENTRIES_SUMMARY_PATH,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
} from '../../../common/http_api/log_entries';
import { parseFilterQuery } from '../../utils/serialized_query';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initLogEntriesSummaryRoute = ({ framework, logEntries }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_SUMMARY_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntriesSummaryRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const { sourceId, startDate, endDate, bucketSize, query } = payload;

        const buckets = await logEntries.getLogSummaryBucketsBetween(
          requestContext,
          sourceId,
          startDate,
          endDate,
          bucketSize,
          parseFilterQuery(query)
        );

        return response.ok({
          body: logEntriesSummaryResponseRT.encode({
            data: {
              start: startDate,
              end: endDate,
              buckets,
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
