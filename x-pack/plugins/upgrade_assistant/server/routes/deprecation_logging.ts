/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';

import {
  getDeprecationLoggingStatus,
  setDeprecationLogging,
} from '../lib/es_deprecation_logging_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerDeprecationLoggingRoutes({ router }: RouteDependencies) {
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
        const result = await getDeprecationLoggingStatus(client);
        return response.ok({ body: result });
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
        const { isEnabled } = request.body as { isEnabled: boolean };
        return response.ok({
          body: await setDeprecationLogging(client, isEnabled),
        });
      }
    )
  );
}
