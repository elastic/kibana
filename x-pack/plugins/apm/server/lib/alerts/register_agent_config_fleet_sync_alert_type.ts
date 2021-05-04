/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { take } from 'rxjs/operators';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { createAPMLifecycleRuleType } from './create_apm_lifecycle_rule_type';
import { convertConfigSettingsToString } from '../settings/agent_configuration/convert_settings_to_string';
import { AgentConfiguration } from '../../../common/agent_configuration/configuration_types';
import { syncAgentConfigsToApmPackagePolicies } from '../fleet/sync_agent_configs_to_apm_package_policies';

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.AgentConfigFleetSync];

export function registerAgentConfigFleetSyncAlertType({
  registry,
  config$,
  getFleetPluginStart,
}: RegisterRuleDependencies) {
  registry.registerType(
    createAPMLifecycleRuleType({
      id: AlertType.AgentConfigFleetSync,
      name: alertTypeConfig.name,
      actionGroups: alertTypeConfig.actionGroups,
      defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
      validate: {
        params: schema.any(),
      },
      actionVariables: {
        context: [],
      },
      producer: 'apm',
      minimumLicenseRequired: 'basic',
      executor: async ({ services, state }) => {
        const config = await config$.pipe(take(1)).toPromise();
        const indices = await getApmIndices({
          config,
          savedObjectsClient: services.savedObjectsClient,
        });

        const searchParams = {
          index: indices['apmAgentConfigurationIndex'],
          body: {
            size: 1,
            query: {
              match_all: {},
            },
            sort: { '@timestamp': 'desc' as const },
          },
        };

        const response = await alertingEsClient({
          scopedClusterClient: services.scopedClusterClient,
          params: searchParams,
        });
        if (response.hits.total.value === 0) {
          return {};
        }

        const { ['@timestamp']: lastTimestamp } = response.hits.hits[0]
          ._source as { '@timestamp': number };
        // @ts-ignore
        if (lastTimestamp > state.lastTimestamp) {
          const fleetPluginStart = await getFleetPluginStart();
          if (fleetPluginStart) {
            services.logger.info(
              `New agent configurations detected. Updating fleet policy...`
            );
            const configurationsSearchResponse = await alertingEsClient({
              scopedClusterClient: services.scopedClusterClient,
              params: {
                index: indices['apmAgentConfigurationIndex'],
                body: { size: 200, query: { match_all: {} } },
              },
            });
            const agentConfigurations = configurationsSearchResponse.hits.hits
              // @ts-ignore
              .map(convertConfigSettingsToString)
              .map((hit) => hit._source) as AgentConfiguration[];
            await syncAgentConfigsToApmPackagePolicies({
              fleetPluginStart,
              savedObjectsClient: services.savedObjectsClient,
              esClient: services.scopedClusterClient.asCurrentUser,
              agentConfigurations,
            });
            services.logger.info(`Policy updated.`);
          }
        }
        return { lastTimestamp };
      },
    })
  );
}
