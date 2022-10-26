/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  probabilityRt,
  rangeRt
} from '../default_api_types';
import { getAgents } from './get_agents';

const agentExplorerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/agent_explorer',
  options: { tags: ['access:apm'] },
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      probabilityRt,
      t.partial({
        serviceName: t.string,
        agentLanguage: t.string,
      }),
    ]),
  }),
  async handler(resources): Promise<{
    items: Array<{
      serviceName: string;
      environments: string[];
      agentName?: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
      agentVersion: string[];
      agentLastVersion?: string;
      agentRepoUrl?: string;
    }>;
  }> {
    const {
      params,
      request,
      plugins: { security },
      logger,
      core,
    } = resources;

    const {
      environment,
      kuery,
      start,
      end,
      probability,
      serviceName,
      agentLanguage,
    } = params.query;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    return getAgents({
      environment,
      serviceName,
      agentLanguage,
      kuery,
      apmEventClient,
      start,
      end,
      randomSampler,
      core: core.setup,
      logger,
    });
  },
});

export const agentExplorerRouteRepository = {
  ...agentExplorerRoute,
};
