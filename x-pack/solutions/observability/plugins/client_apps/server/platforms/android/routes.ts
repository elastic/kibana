/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import {
  ANDROID_CRASH_DOCUMENT_API_PATH,
  ANDROID_RETRACE_API_PATH,
  DEFAULT_CRASH_INDEX,
} from '../../../common';
import { RetraceMapNotFoundError, retrace } from './retrace';
import { handleRouteError } from '../../lib/handle_route_error';

export function registerAndroidRoutes({ router, logger }: { router: IRouter; logger: Logger }) {
  router.get(
    {
      path: ANDROID_CRASH_DOCUMENT_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is scoped to internal use and does not require authorization yet',
        },
      },
      options: {
        access: 'internal',
      },
      validate: {
        query: schema.object({
          doc_id: schema.string({ minLength: 1 }),
          index: schema.maybe(schema.string({ minLength: 1 })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { doc_id: docId, index = DEFAULT_CRASH_INDEX } = request.query;

        const result = await esClient.search({
          index,
          query: { ids: { values: [docId] } },
          size: 1,
          _source: ['attributes'],
        });

        const hit = result.hits?.hits?.[0];
        if (!hit) {
          return response.notFound({
            body: {
              message: `No Android crash document found for id "${docId}" in index "${index}"`,
            },
          });
        }

        const attrs: Record<string, unknown> = (hit._source as any)?.attributes ?? {};
        const stacktrace = attrs['exception.stacktrace'];
        const buildId = attrs['app.build_id'];

        if (typeof stacktrace !== 'string' || !stacktrace) {
          return response.badRequest({
            body: { message: `Document "${docId}" has no exception.stacktrace field` },
          });
        }
        if (typeof buildId !== 'string' || !buildId) {
          return response.badRequest({
            body: { message: `Document "${docId}" has no app.build_id field` },
          });
        }

        return response.ok({ body: { stacktrace, build_id: buildId } });
      } catch (error) {
        return handleRouteError({
          error,
          logger,
          response,
          message: 'Failed to fetch Android crash document',
        });
      }
    }
  );

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
        access: 'internal',
      },
      validate: {
        body: schema.object({
          stacktrace: schema.string({ minLength: 1 }),
          build_id: schema.string({ minLength: 1 }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const { stacktrace, build_id: buildId } = request.body;

        const retraced = await retrace({ esClient, stacktrace, buildId, logger });

        return response.ok({
          body: { original: stacktrace, retraced },
        });
      } catch (error) {
        if (error instanceof RetraceMapNotFoundError) {
          return response.notFound({ body: { message: (error as Error).message } });
        }
        return handleRouteError({ error, logger, response, message: 'Android retrace failed' });
      }
    }
  );
}
