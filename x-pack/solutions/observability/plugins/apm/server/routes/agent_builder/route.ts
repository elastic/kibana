/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreSetup } from '@kbn/core/server';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
import { createApmAgentBuilderRoute } from './create_route';
import { getServices } from '../../agent_builder/services/get_services';
import { getServicesRequestSchema } from '../../agent_builder/services/get_services';
import type { GetServicesResponse } from '../../agent_builder/services/get_services';

const getServicesRoute = createApmAgentBuilderRoute({
  endpoint: 'GET /api/apm/services 2023-10-31',
  params: z.object({
    query: getServicesRequestSchema,
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler({ params, request, core, plugins, logger }): Promise<GetServicesResponse> {
    const { start, end, anomalySeverities, kqlFilter } = params.query;

    const setupPlugins = Object.fromEntries(
      Object.entries(plugins).map(([key, value]): [string, unknown] => [key, value.setup])
    ) as unknown as APMPluginSetupDependencies;

    return getServices({
      core: core.setup as CoreSetup<APMPluginStartDependencies>,
      plugins: setupPlugins,
      request,
      logger,
      start,
      end,
      anomalySeverities,
      kqlFilter,
    });
  },
});

export const agentBuilderRouteRepository = {
  ...getServicesRoute,
};
