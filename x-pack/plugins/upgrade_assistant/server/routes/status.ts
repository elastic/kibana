/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { API_BASE_PATH } from '../../common/constants';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { getKibanaUpgradeStatus } from '../lib/kibana_status';
import { RouteDependencies } from '../types';

/**
 * Note that this route is primarily intended for consumption by Cloud.
 */
export function registerUpgradeStatusRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/status`,
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client: esClient },
            deprecations: { client: deprecationsClient },
          },
        },
        request,
        response
      ) => {
        try {
          // Fetch ES upgrade status
          const { totalCriticalDeprecations: esTotalCriticalDeps } = await getESUpgradeStatus(
            esClient
          );
          // Fetch Kibana upgrade status
          const { totalCriticalDeprecations: kibanaTotalCriticalDeps } =
            await getKibanaUpgradeStatus(deprecationsClient);
          const readyForUpgrade = esTotalCriticalDeps === 0 && kibanaTotalCriticalDeps === 0;

          const getStatusMessage = () => {
            if (readyForUpgrade) {
              return i18n.translate(
                'xpack.upgradeAssistant.status.allDeprecationsResolvedMessage',
                {
                  defaultMessage: 'All deprecation warnings have been resolved.',
                }
              );
            }

            return i18n.translate('xpack.upgradeAssistant.status.deprecationsUnresolvedMessage', {
              defaultMessage:
                'You have {esTotalCriticalDeps} Elasticsearch deprecation {esTotalCriticalDeps, plural, one {issue} other {issues}} and {kibanaTotalCriticalDeps} Kibana deprecation {kibanaTotalCriticalDeps, plural, one {issue} other {issues}} that must be resolved before upgrading.',
              values: { esTotalCriticalDeps, kibanaTotalCriticalDeps },
            });
          };

          return response.ok({
            body: {
              readyForUpgrade,
              details: getStatusMessage(),
            },
          });
        } catch (error) {
          return handleEsError({ error, response });
        }
      }
    )
  );
}
