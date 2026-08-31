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
  ANDROID_CRASH_EVENT_NAMES,
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
          requiredPrivileges: ['apm'],
        },
      },
      options: {
        access: 'internal',
      },
      validate: {
        query: schema.object({
          session_id: schema.string({ minLength: 1, maxLength: 1024 }),
          timestamp: schema.string({ minLength: 1, maxLength: 64 }),
          app_build_id: schema.string({ minLength: 1, maxLength: 1024 }),
          index: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const {
          session_id: sessionId,
          timestamp,
          app_build_id: appBuildId,
          index = DEFAULT_CRASH_INDEX,
        } = request.query;

        const result = await esClient.search({
          index,
          query: {
            bool: {
              filter: [
                { term: { 'session.id': sessionId } },
                { term: { '@timestamp': timestamp } },
                { term: { 'app.build_id': appBuildId } },
                { terms: { event_name: ANDROID_CRASH_EVENT_NAMES } },
              ],
            },
          },
          sort: [{ '@timestamp': 'desc' }],
          size: 1,
          _source: ['attributes'],
        });

        const identity = `session.id="${sessionId}", @timestamp="${timestamp}", app.build_id="${appBuildId}"`;

        const hit = result.hits?.hits?.[0];
        if (!hit) {
          return response.notFound({
            body: {
              message: `No Android crash document found for ${identity} in index "${index}"`,
            },
          });
        }

        const attrs: Record<string, unknown> = (hit._source as any)?.attributes ?? {};
        const stacktrace = attrs['exception.stacktrace'];

        if (typeof stacktrace !== 'string' || !stacktrace) {
          return response.badRequest({
            body: { message: `Document for ${identity} has no exception.stacktrace field` },
          });
        }

        return response.ok({ body: { stacktrace, build_id: appBuildId } });
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
          requiredPrivileges: ['apm'],
        },
      },
      options: {
        access: 'internal',
      },
      validate: {
        body: schema.object({
          stacktrace: schema.string({ minLength: 1, maxLength: 100000 }),
          build_id: schema.string({ minLength: 1, maxLength: 1024 }),
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
