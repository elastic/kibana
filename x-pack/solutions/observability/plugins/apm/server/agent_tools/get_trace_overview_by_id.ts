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
import { getRootTransactionByTraceId } from '../routes/transactions/get_transaction_by_trace';
import { getTraceSummaryCount } from '../routes/traces/get_trace_summary_count';
import { getApmTraceError } from '../routes/traces/get_trace_items';
import { OBSERVABILITY_GET_TRACE_OVERVIEW_BY_ID_TOOL_ID } from '../../common/observability_agent/agent_tool_ids';
import { parseDatemath } from './utils/time';

const getTraceOverviewByIdSchema = z.object({
  ...timeRangeSchema.shape,
  traceId: z.string().describe('Trace identifier'),
});

export function createGetTraceOverviewByIdTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getTraceOverviewByIdSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getTraceOverviewByIdSchema> = {
    id: OBSERVABILITY_GET_TRACE_OVERVIEW_BY_ID_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Fetch an overview of a trace: root transaction, summary counts, first page of items, and APM errors.',
    schema: getTraceOverviewByIdSchema,
    tags: ['observability', 'apm', 'trace'],
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

        const { start, end, traceId } = args;
        const startMs = parseDatemath(start);
        const endMs = parseDatemath(end);

        const [rootTransaction, summary, apmErrors] = await Promise.all([
          getRootTransactionByTraceId({
            apmEventClient,
            traceId,
            start: startMs,
            end: endMs,
          }),
          getTraceSummaryCount({
            apmEventClient,
            traceId,
            start: startMs,
            end: endMs,
          }),
          getApmTraceError({
            apmEventClient,
            traceId,
            start: startMs,
            end: endMs,
          }),
        ]);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                rootTransaction: rootTransaction.transaction,
                summary,
                errors: {
                  total: apmErrors.length,
                  apmErrorSamples: apmErrors.slice(0, 5),
                },
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error fetching trace overview: ${error.message}`);
        logger.debug(error);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch trace overview: ${error.message}`,
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
