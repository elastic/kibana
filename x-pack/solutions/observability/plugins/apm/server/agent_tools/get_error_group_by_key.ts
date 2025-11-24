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
import { timeRangeSchema } from './utils/tool_schemas';
import { buildApmToolResources } from './utils/build_apm_tool_resources';
import { getApmToolAvailability } from './utils/get_apm_tool_availability';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';
import { getErrorGroupSampleIds } from '../routes/errors/get_error_groups/get_error_group_sample_ids';
import { OBSERVABILITY_GET_ERROR_GROUP_BY_KEY_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';
import { parseDatemath } from './utils/time';

const getErrorGroupByKeySchema = z.object({
  ...timeRangeSchema.shape,
  serviceName: z.string().describe('Service name of the error group'),
  errorGroupingKey: z.string().describe('Error grouping key to fetch the specific error group'),
  environment: z.string().optional().describe('Optional environment filter'),
  kqlFilter: z.string().optional().describe('Optional KQL filter to narrow results'),
});

export function createGetErrorGroupByKeyTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getErrorGroupByKeySchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getErrorGroupByKeySchema> = {
    id: OBSERVABILITY_GET_ERROR_GROUP_BY_KEY_TOOL_ID,
    type: ToolType.builtin,
    description: 'Fetch an error group by error.grouping_key and return recent sample error ids.',
    schema: getErrorGroupByKeySchema,
    tags: ['observability', 'apm', 'error'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getApmToolAvailability({ core, plugins, request, logger });
      },
    },
    handler: async (args, context) => {
      const { request, esClient, logger: scopedLogger } = context;
      try {
        const { apmEventClient } = await buildApmToolResources({
          core,
          plugins,
          request,
          esClient,
          logger: scopedLogger,
        });

        const {
          start,
          end,
          serviceName,
          errorGroupingKey,
          environment = '',
          kqlFilter = '',
        } = args;

        const { errorSampleIds, occurrencesCount } = await getErrorGroupSampleIds({
          apmEventClient,
          environment,
          kuery: kqlFilter,
          serviceName,
          groupId: errorGroupingKey,
          start: parseDatemath(start),
          end: parseDatemath(end),
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { errorSampleIds, occurrencesCount },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching error group by key: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch error group: ${error.message}`,
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
