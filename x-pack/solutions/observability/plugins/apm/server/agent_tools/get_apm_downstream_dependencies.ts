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
import { getApmDownstreamDependencies } from '../routes/assistant_functions/get_apm_downstream_dependencies';
import { OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';

const getApmDownstreamDependenciesToolSchema = z.object({
  ...timeRangeSchema.shape,
  serviceName: z.string().min(1).describe('The name of the service'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'The environment that the service is running in. Leave empty to query for all environments.'
    ),
});

export function createApmDownstreamDependenciesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getApmDownstreamDependenciesToolSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getApmDownstreamDependenciesToolSchema> = {
    id: OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Get downstream dependencies (services or uninstrumented backends) for a given service and time range.',
    schema: getApmDownstreamDependenciesToolSchema,
    tags: ['observability', 'apm', 'dependencies'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getApmToolAvailability({ core, plugins, request, logger });
      },
    },
    handler: async (args, context) => {
      const { request, esClient, logger: scopedLogger } = context;

      try {
        const { apmEventClient, randomSampler } = await buildApmToolResources({
          core,
          plugins,
          request,
          esClient,
          logger: scopedLogger,
        });

        const result = await getApmDownstreamDependencies({
          arguments: args,
          apmEventClient,
          randomSampler,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { dependencies: result },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error getting APM downstream dependencies: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch downstream dependencies: ${error.message}`,
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
