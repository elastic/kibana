/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/onechat-server';
import { ToolType } from '@kbn/onechat-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { timeRangeSchema } from '@kbn/observability-agent-plugin/server/utils/tool_schemas';
import { buildApmToolResources } from './utils/build_apm_tool_resources';
import { getApmToolAvailability } from './utils/get_apm_tool_availability';
import { getApmServiceList } from '../routes/assistant_functions/get_apm_service_list';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { ServiceHealthStatus } from '../../common/service_health_status';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';

const getServicesSchema = z.object({
  ...timeRangeSchema.shape,
  serviceEnvironment: z
    .string()
    .min(1)
    .optional()
    .describe('Optionally filter the services by the environments that they are running in.'),
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
    .describe('Optionally filter the services by their health status.'),
});

export function createGetServicesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getServicesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getServicesSchema> = {
    id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
    type: ToolType.builtin,
    description: 'Get the list of monitored services, their health status, and alerts.',
    schema: getServicesSchema,
    tags: ['observability', 'services'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getApmToolAvailability({ core, plugins, request, logger });
      },
    },
    handler: async (args, context) => {
      const { request, esClient, logger: scopedLogger } = context;

      try {
        const { apmEventClient, randomSampler, mlClient, apmAlertsClient } =
          await buildApmToolResources({
            core,
            plugins,
            request,
            esClient,
            logger: scopedLogger,
          });

        const services = await getApmServiceList({
          apmEventClient,
          apmAlertsClient,
          randomSampler,
          mlClient,
          logger: scopedLogger,
          arguments: args,
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
        logger.error(`Error getting services: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch services: ${error.message}`,
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
