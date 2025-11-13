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
import { buildApmToolResources } from './utils/build_apm_tool_resources';
import { getApmToolAvailability } from './utils/get_apm_tool_availability';
import { getAssistantDownstreamDependencies } from '../routes/assistant_functions/get_apm_downstream_dependencies';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID } from '../../common/agent_tool_ids';

const schema = z.object({
  serviceName: z.string().min(1).describe('The name of the service'),
  serviceEnvironment: z
    .string()
    .optional()
    .describe(
      'The environment that the service is running in. Leave empty to query for all environments.'
    ),
  start: z.string().min(1).describe('The start time in date math (e.g., now-24h)'),
  end: z.string().min(1).describe('The end time in date math (e.g., now)'),
});

export async function createApmDownstreamDependenciesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}) {
  const toolDefinition: BuiltinToolDefinition<typeof schema> = {
    id: OBSERVABILITY_GET_APM_DOWNSTREAM_DEPENDENCIES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Get downstream dependencies (services or uninstrumented backends) for a given APM service and time range.',
    schema,
    tags: ['apm', 'dependencies', 'observability'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getApmToolAvailability({ core, plugins, request, logger });
      },
    },
    handler: async (args, { request, logger: scopedLogger }) => {
      try {
        const { apmEventClient, randomSampler } = await buildApmToolResources({
          core,
          plugins,
          request,
          logger: scopedLogger,
        });

        const result = await getAssistantDownstreamDependencies({
          arguments: {
            serviceName: args.serviceName,
            serviceEnvironment: args.serviceEnvironment,
            start: args.start,
            end: args.end,
          },
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
        logger.error(`APM downstream dependencies tool failed: ${error.message}`);
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
