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
import { OBSERVABILITY_GET_ERROR_BY_ID_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';
import { getErrorSampleDetails } from '../routes/errors/get_error_groups/get_error_sample_details';
import { parseDatemath } from './utils/time';

const getErrorByIdSchema = z.object({
  ...timeRangeSchema.shape,
  errorId: z.string().describe('Error identifier to fetch the specific error document'),
  serviceName: z.string().describe('Service name of the error document'),
  environment: z.string().optional().describe('Optional environment filter'),
  kqlFilter: z.string().optional().describe('Optional KQL filter to narrow results'),
});

export function createGetErrorByIdTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getErrorByIdSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getErrorByIdSchema> = {
    id: OBSERVABILITY_GET_ERROR_BY_ID_TOOL_ID,
    type: ToolType.builtin,
    description: 'Fetch a single error document by error.id or _id.',
    schema: getErrorByIdSchema,
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

        const { start, end, errorId, serviceName, environment = '', kqlFilter = '' } = args;

        const { error, transaction } = await getErrorSampleDetails({
          environment,
          kuery: kqlFilter,
          serviceName,
          errorId,
          apmEventClient,
          start: parseDatemath(start),
          end: parseDatemath(end),
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                error,
                transaction,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Failed to fetch error by id: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to fetch error: ${error.message}`, stack: error.stack },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
