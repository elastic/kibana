/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { schema } from '@kbn/config-schema';
import {
  API_BASE_PATH,
  APPS_WITH_DEPRECATION_LOGS,
  DEPRECATION_LOGS_ORIGIN_FIELD,
} from '../../common/constants';

import {
  getDeprecationLoggingStatus,
  setDeprecationLogging,
} from '../lib/es_deprecation_logging_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';
import { DEPRECATION_LOGS_INDEX } from '../../common/constants';

export function registerDeprecationLoggingRoutes({
  router,
  lib: { handleEsError },
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/deprecation_logging`,
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const result = await getDeprecationLoggingStatus(client);
          return response.ok({ body: result });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );

  router.put(
    {
      path: `${API_BASE_PATH}/deprecation_logging`,
      validate: {
        body: schema.object({
          isEnabled: schema.boolean(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const { isEnabled } = request.body as { isEnabled: boolean };
          return response.ok({
            body: await setDeprecationLogging(client, isEnabled),
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );

  router.get(
    {
      path: `${API_BASE_PATH}/deprecation_logging/count`,
      validate: {
        query: schema.object({
          from: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const indexExists = await client.asCurrentUser.indices.exists({
            index: DEPRECATION_LOGS_INDEX,
          });

          if (!indexExists) {
            return response.ok({ body: { count: 0 } });
          }

          const now = moment().toISOString();

          const body = await client.asCurrentUser.count({
            index: DEPRECATION_LOGS_INDEX,
            body: {
              query: {
                bool: {
                  must: {
                    range: {
                      '@timestamp': {
                        gte: request.query.from,
                        lte: now,
                      },
                    },
                  },
                  must_not: {
                    terms: {
                      [DEPRECATION_LOGS_ORIGIN_FIELD]: [...APPS_WITH_DEPRECATION_LOGS],
                    },
                  },
                },
              },
            },
          });

          return response.ok({ body: { count: body.count } });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );

  router.delete(
    {
      path: `${API_BASE_PATH}/deprecation_logging/cache`,
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          await client.asCurrentUser.transport.request({
            method: 'DELETE',
            path: '/_logging/deprecation_cache',
          });

          return response.ok({ body: 'ok' });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );
}
