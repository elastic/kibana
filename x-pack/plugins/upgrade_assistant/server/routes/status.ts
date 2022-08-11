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
import { getESSystemIndicesMigrationStatus } from '../lib/es_system_indices_migration';
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
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      try {
        const {
          elasticsearch: { client: esClient },
          deprecations: { client: deprecationsClient },
        } = await core;
        // Fetch ES upgrade status
        const { totalCriticalDeprecations: esTotalCriticalDeps } = await getESUpgradeStatus(
          esClient
        );
        // Fetch system indices migration status
        const { migration_status: systemIndicesMigrationStatus, features } =
          await getESSystemIndicesMigrationStatus(esClient.asCurrentUser);
        const notMigratedSystemIndices = features.filter(
          (feature) => feature.migration_status !== 'NO_MIGRATION_NEEDED'
        ).length;

        // Fetch Kibana upgrade status
        const { totalCriticalDeprecations: kibanaTotalCriticalDeps } = await getKibanaUpgradeStatus(
          deprecationsClient
        );
        const readyForUpgrade =
          esTotalCriticalDeps === 0 &&
          kibanaTotalCriticalDeps === 0 &&
          systemIndicesMigrationStatus === 'NO_MIGRATION_NEEDED';

        const getStatusMessage = () => {
          if (readyForUpgrade) {
            return i18n.translate('xpack.upgradeAssistant.status.allDeprecationsResolvedMessage', {
              defaultMessage: 'All deprecation warnings have been resolved.',
            });
          }

          const upgradeIssues: string[] = [];

          if (notMigratedSystemIndices) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.systemIndicesMessage', {
                defaultMessage:
                  '{notMigratedSystemIndices} unmigrated system {notMigratedSystemIndices, plural, one {index} other {indices}}',
                values: { notMigratedSystemIndices },
              })
            );
          }

          if (esTotalCriticalDeps) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.esTotalCriticalDepsMessage', {
                defaultMessage:
                  '{esTotalCriticalDeps} Elasticsearch deprecation {esTotalCriticalDeps, plural, one {issue} other {issues}}',
                values: { esTotalCriticalDeps },
              })
            );
          }

          if (kibanaTotalCriticalDeps) {
            upgradeIssues.push(
              i18n.translate('xpack.upgradeAssistant.status.kibanaTotalCriticalDepsMessage', {
                defaultMessage:
                  '{kibanaTotalCriticalDeps} Kibana deprecation {kibanaTotalCriticalDeps, plural, one {issue} other {issues}}',
                values: { kibanaTotalCriticalDeps },
              })
            );
          }

          return i18n.translate('xpack.upgradeAssistant.status.deprecationsUnresolvedMessage', {
            defaultMessage:
              'The following issues must be resolved before upgrading: {upgradeIssues}.',
            values: {
              upgradeIssues: upgradeIssues.join(', '),
            },
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
    })
  );
}
