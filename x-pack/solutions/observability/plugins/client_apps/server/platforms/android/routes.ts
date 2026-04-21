/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { ANDROID_RETRACE_API_PATH, CRASH_INDEX_PATTERN } from '../../../common';
import { fetchCrashDocument } from './fetch_crash_doc';
import { fetchMappings } from './fetch_mappings';
import { retrace, extractMethodKeys } from './retrace';
import { handleRouteError } from '../../lib/handle_route_error';

export function registerAndroidRoutes({ router, logger }: { router: IRouter; logger: Logger }) {
  router.post(
    {
      path: ANDROID_RETRACE_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is scoped to internal use and does not require authorization yet',
        },
      },
      options: {
        tags: ['access:clientApps'],
      },
      validate: {
        body: schema.object({
          doc_id: schema.string({ minLength: 1 }),
          index: schema.string({ defaultValue: CRASH_INDEX_PATTERN }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { doc_id: docId, index } = request.body;

        const stacktrace = await fetchCrashDocument(esClient, docId, index);
        if (!stacktrace) {
          return response.notFound({
            body: {
              message: `No crash document found with _id "${docId}" in "${index}"`,
            },
          });
        }

        const methodKeys = extractMethodKeys(stacktrace);
        const mappings = await fetchMappings(esClient, methodKeys);
        const deobfuscated = retrace(stacktrace, mappings);

        return response.ok({
          body: { original: stacktrace, resolved: deobfuscated },
        });
      } catch (error) {
        return handleRouteError({ error, logger, response, message: 'Android retrace failed' });
      }
    }
  );
}
