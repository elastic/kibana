/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first } from 'rxjs/operators';
import { getUpgradeAssistantStatus } from '../lib/es_migration_apis';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { extractIndexPatterns } from '../lib/apm/extract_index_patterns';
import { RouteDependencies } from '../types';

export function registerClusterCheckupRoutes({ cloud, router, apmOSS }: RouteDependencies) {
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
          const apmConfig = await apmOSS.config$.pipe(first()).toPromise();
          const indexPatterns = extractIndexPatterns(apmConfig);
          return response.ok({
            body: await getUpgradeAssistantStatus(dataClient, isCloudEnabled, indexPatterns),
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
