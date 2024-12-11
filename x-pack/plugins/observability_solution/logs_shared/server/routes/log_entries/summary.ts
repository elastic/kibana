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

import { i18n } from '@kbn/i18n';
import { logEntriesV1 } from '../../../common/http_api';
import { throwErrors } from '../../../common/runtime_types';

import { LogsSharedBackendLibs } from '../../lib/logs_shared_types';

import { parseFilterQuery } from '../../utils/serialized_query';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initLogEntriesSummaryRoute = ({
  framework,
  logEntries,
  getUsageCollector,
}: LogsSharedBackendLibs) => {
  framework
    .registerVersionedRoute({
      access: 'internal',
      method: 'post',
      path: logEntriesV1.LOG_ENTRIES_SUMMARY_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: escapeHatch } },
        options: {
          deprecated: {
            documentationUrl: '',
            severity: 'warning',
            message: i18n.translate(
              'xpack.logsShared.deprecations.postLogEntriesSummaryRoute.message',
              {
                defaultMessage:
                  'Given the deprecation of the LogStream feature, this API will not return reliable data in upcoming versions of Kibana.',
              }
            ),
            reason: { type: 'deprecate' },
          },
        },
      },
      async (requestContext, request, response) => {
        const payload = pipe(
          logEntriesV1.logEntriesSummaryRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const { logView, startTimestamp, endTimestamp, bucketSize, query } = payload;

        const usageCollector = getUsageCollector();

        const buckets = await logEntries.getLogSummaryBucketsBetween(
          requestContext,
          logView,
          startTimestamp,
          endTimestamp,
          bucketSize,
          parseFilterQuery(query)
        );

        if (typeof usageCollector.countLogs === 'function') {
          usageCollector.countLogs();
        }

        return response.ok({
          body: logEntriesV1.logEntriesSummaryResponseRT.encode({
            data: {
              start: startTimestamp,
              end: endTimestamp,
              buckets,
            },
          }),
        });
      }
    );
};
