/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { getDataTierFilterCombined } from '@kbn/apm-data-access-plugin/server/utils';
import { buildApmToolResources } from './utils/build_apm_tool_resources';
import { getApmServiceList } from '../routes/assistant_functions/get_apm_service_list';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { ServiceHealthStatus } from '../../common/service_health_status';
import { APM_ALERTING_RULE_TYPE_IDS } from '../../common/alerting/config/apm_alerting_feature_ids';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '../../common/agent_tool_ids';

const schema = z.object({
  serviceEnvironment: z
    .string()
    .optional()
    .describe('Optionally filter the services by the environments that they are running in'),
  start: z.string().min(1).describe('The start of the time range, in Elasticsearch date math.'),
  end: z.string().min(1).describe('The end of the time range, in Elasticsearch date math.'),
  healthStatus: z
    .array(
      z.enum([
        ServiceHealthStatus.unknown,
        ServiceHealthStatus.healthy,
        ServiceHealthStatus.warning,
        ServiceHealthStatus.critical,
      ])
    )
    .optional()
    .describe('Filter service list by health status'),
});

export async function createApmGetServicesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof schema> = {
    id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
    type: ToolType.builtin,
    description: 'Get the list of monitored APM services, their health status, and alerts.',
    schema,
    tags: ['apm', 'services', 'observability'],
    handler: async (args, { request, logger: scopedLogger }) => {
      try {
        const { apmEventClient, randomSampler, hasHistoricalData } = await buildApmToolResources({
          core,
          plugins,
          request,
          logger: scopedLogger,
        });

        if (!hasHistoricalData) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: { services: [] },
              },
            ],
          };
        }

        // Alerts client adapter
        const [coreStart, pluginStarts] = await core.getStartServices();
        const alertsClient = await pluginStarts.ruleRegistry.getRacClientWithRequest(request);
        const apmAlertsIndices =
          (await alertsClient.getAuthorizedAlertsIndices(APM_ALERTING_RULE_TYPE_IDS)) || [];
        const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
          coreStart.savedObjects.getScopedClient(request)
        );
        const excludedDataTiers = await uiSettingsClient.get<any>(
          // typed in helper; keep any to avoid import churn
          '@kbn/observability:searchExcludedDataTiers'
        );
        const apmAlertsClient = {
          search: async (searchParams: any) =>
            alertsClient.find({
              ...searchParams,
              query: getDataTierFilterCombined({
                filter: searchParams.query,
                excludedDataTiers,
              }),
              index: apmAlertsIndices.join(','),
            }) as Promise<any>,
        };

        // ML client (best-effort)
        let mlClient: any | undefined;
        try {
          const mlStart = pluginStarts.ml;
          if (mlStart) {
            // ML start does not expose providers; omit ML if not easily available
            mlClient = undefined;
          }
        } catch (e) {
          scopedLogger.debug(`ML client unavailable: ${e.message}`);
        }

        const services = await getApmServiceList({
          arguments: args as any,
          apmEventClient,
          mlClient,
          apmAlertsClient,
          logger: scopedLogger,
          randomSampler,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { services },
            },
          ],
        };
      } catch (error) {
        logger.error(`APM get services tool failed: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch APM services: ${error.message}`,
                stack: error.stack,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
