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
import { getSpan } from '../routes/transactions/get_span';
import { OBSERVABILITY_GET_SPAN_BY_ID_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';
import { parseDatemath } from './utils/time';

const getSpanByIdSchema = z.object({
  ...timeRangeSchema.shape,
  spanId: z.string().describe('Span identifier to fetch the specific span document'),
  traceId: z.string().describe('Trace identifier that the span belongs to'),
  parentTransactionId: z.string().optional().describe('Optional parent transaction identifier'),
});

export function createGetSpanByIdTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getSpanByIdSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getSpanByIdSchema> = {
    id: OBSERVABILITY_GET_SPAN_BY_ID_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Fetch a single span by span.id and trace.id (optionally with its parent transaction).',
    schema: getSpanByIdSchema,
    tags: ['observability', 'apm', 'span'],
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

        const { start, end, spanId, traceId, parentTransactionId } = args;
        const { span, parentTransaction } = await getSpan({
          apmEventClient,
          spanId,
          traceId,
          parentTransactionId,
          start: parseDatemath(start),
          end: parseDatemath(end),
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { span, parentTransaction },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching span by id: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to fetch span: ${error.message}`, stack: error.stack },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
