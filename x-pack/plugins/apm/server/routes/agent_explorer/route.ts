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
  rangeRt,
} from '../default_api_types';
import { getAgents } from './get_agents';
import { getAgentInstances } from './get_agent_instances';

const agentExplorerRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/get_agents_per_service',
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
      agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
      agentVersion: string[];
      agentDocsPageUrl?: string;
      instances: number;
    }>;
  }> {
    const {
      params,
      request,
      plugins: { security },
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
    });
  },
});

const agentExplorerInstanceRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/agent_instances',
  options: { tags: ['access:apm'] },
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([environmentRt, kueryRt, rangeRt, probabilityRt]),
  }),
  async handler(resources): Promise<{
    items: Array<{
      serviceNode?: string;
      environments: string[];
      agentVersion: string;
      lastReport: string;
    }>;
  }> {
    const { params } = resources;

    const { environment, kuery, start, end } = params.query;

    const { serviceName } = params.path;

    const apmEventClient = await getApmEventClient(resources);

    return {
      items: await getAgentInstances({
        environment,
        serviceName,
        kuery,
        apmEventClient,
        start,
        end,
      }),
    };
  },
});

export const agentExplorerRouteRepository = {
  ...agentExplorerRoute,
  ...agentExplorerInstanceRoute,
};
