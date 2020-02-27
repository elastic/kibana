/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUpgradeAssistantStatus } from '../lib/es_migration_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerClusterCheckupRoutes({ cloud, router }: RouteDependencies) {
  const isCloudEnabled = Boolean(cloud?.isCloudEnabled);

  router.get(
    {
      path: '/api/upgrade_assistant/status',
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { dataClient },
          },
        },
        request,
        response
      ) => {
        try {
          return response.ok({
            body: await getUpgradeAssistantStatus(dataClient, isCloudEnabled),
          });
        } catch (e) {
          if (e.status === 403) {
            return response.forbidden(e.message);
          }

          return response.internalError({ body: e });
        }
      }
    )
  );
}
