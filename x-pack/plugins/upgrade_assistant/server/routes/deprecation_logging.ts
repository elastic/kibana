/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import {
  getDeprecationLoggingStatus,
  setDeprecationLogging,
} from '../lib/es_deprecation_logging_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerDeprecationLoggingRoutes({ router }: RouteDependencies) {
  router.get(
    {
      path: '/api/upgrade_assistant/deprecation_logging',
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: {
              legacy: { client },
            },
          },
        },
        request,
        response
      ) => {
        try {
          const result = await getDeprecationLoggingStatus(client);
          return response.ok({ body: result });
        } catch (e) {
          return response.internalError({ body: e });
        }
      }
    )
  );

  router.put(
    {
      path: '/api/upgrade_assistant/deprecation_logging',
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
            elasticsearch: {
              legacy: { client },
            },
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
        } catch (e) {
          return response.internalError({ body: e });
        }
      }
    )
  );
}
