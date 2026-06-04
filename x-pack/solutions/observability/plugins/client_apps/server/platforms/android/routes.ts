/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter, Logger } from '@kbn/core/server';
import { ANDROID_RETRACE_API_PATH, DEFAULT_CRASH_INDEX } from '../../../common';
import { retrace } from './retrace';
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
          index: schema.maybe(schema.string({ minLength: 1 })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { doc_id: docId, index = DEFAULT_CRASH_INDEX } = request.body;

        const crashDoc = await fetchCrashDocument(esClient, docId, index);
        if (!crashDoc) {
          return response.notFound({
            body: { message: `No crash document found for doc_id "${docId}" in index "${index}"` },
          });
        }

        const resolved = await retrace({
          esClient,
          stacktrace: crashDoc.stacktrace,
          buildId: crashDoc.buildId,
          logger,
        });

        return response.ok({
          body: { original: crashDoc.stacktrace, resolved },
        });
      } catch (error) {
        return handleRouteError({ error, logger, response, message: 'Android retrace failed' });
      }
    }
  );
}

interface CrashDoc {
  stacktrace: string;
  buildId: string;
}

async function fetchCrashDocument(
  esClient: ElasticsearchClient,
  docId: string,
  index: string
): Promise<CrashDoc | null> {
  const result = await esClient.search({
    index,
    query: { ids: { values: [docId] } },
    size: 1,
    _source: ['attributes'],
  });

  const hit = result.hits?.hits?.[0];
  if (!hit) return null;

  const attrs: Record<string, unknown> = hit._source?.attributes ?? {};
  const stacktrace = attrs['exception.stacktrace'];
  if (typeof stacktrace !== 'string' || !stacktrace) return null;

  const buildId = typeof attrs['app.build_id'] === 'string' ? attrs['app.build_id'] : undefined;
  if (!buildId) return null;

  return { stacktrace, buildId };
}
