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
import { getTransaction } from '../routes/transactions/get_transaction';
import { OBSERVABILITY_GET_TRANSACTION_BY_ID_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';
import { parseDatemath } from './utils/time';

const getTransactionByIdSchema = z.object({
  ...timeRangeSchema.shape,
  transactionId: z
    .string()
    .describe('Transaction identifier to fetch the specific transaction document'),
  traceId: z.string().optional().describe('Optional trace identifier to narrow the search'),
});

export function createGetTransactionByIdTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getTransactionByIdSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getTransactionByIdSchema> = {
    id: OBSERVABILITY_GET_TRANSACTION_BY_ID_TOOL_ID,
    type: ToolType.builtin,
    description: 'Fetch a single transaction by transaction.id (optionally filtered by trace.id).',
    schema: getTransactionByIdSchema,
    tags: ['observability', 'apm', 'transaction'],
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

        const { start, end, transactionId, traceId } = args;

        const transaction = await getTransaction({
          apmEventClient,
          transactionId,
          traceId,
          start: parseDatemath(start),
          end: parseDatemath(end),
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { transaction },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching transaction by id: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch transaction: ${error.message}`,
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
