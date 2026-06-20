/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { OBSERVABILITY_GET_SERVICES_TOOL_ID } from '@kbn/apm-types';
import { getAgentBuilderResourceAvailability } from '@kbn/observability-agent-builder-plugin/server';
import { getServices, getServicesRequestSchema } from '../../services/get_services';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../../types';

export function createGetServicesTool({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
  logger: Logger;
}): StaticToolRegistration<typeof getServicesRequestSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getServicesRequestSchema> = {
    id: OBSERVABILITY_GET_SERVICES_TOOL_ID,
    type: ToolType.builtin,
    description: `Retrieves a list of services from APM, logs, and metrics data sources.

For APM services, includes anomaly severity, active alert counts, and key performance metrics (latency, transaction error rate, throughput).
For services found only in logs or metrics, basic information like service name and environment is returned.

When to use:
- Getting a high-level overview of system status from a service perspective
- Identifying key metrics for services like latency, error rate, throughput, anomalies and alert counts
- Answering "which services are having problems?"
- Discovering services that may not be instrumented with APM but appear in logs or metrics`,
    schema: getServicesRequestSchema,
    tags: ['observability', 'services'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (toolParams, context) => {
      const { start, end, anomalySeverities, kqlFilter } = toolParams;
      const { request } = context;

      try {
        const result = await getServices({
          core,
          plugins,
          request,
          logger,
          start,
          end,
          anomalySeverities,
          kqlFilter,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: result.services.length,
                services: result.services,
                maxCountExceeded: result.maxCountExceeded,
                serviceOverflowCount: result.serviceOverflowCount,
              },
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
