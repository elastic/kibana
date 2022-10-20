import * as t from 'io-ts';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { setupRequest } from '../../lib/helpers/setup_request';
import { createApmServerRoute } from "../apm_routes/create_apm_server_route";
import { environmentRt, kueryRt, probabilityRt, rangeRt } from '../default_api_types';
import { getAgents } from './get_agents';
import { getAgentsInstances } from './get_agents_instances';

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
        agentName: t.string,
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
      agentName,
    } = params.query;

    const [setup, randomSampler] = await Promise.all([
      setupRequest(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    return getAgents({
      environment,
      serviceName,
      agentName,
      kuery,
      setup,
      start,
      end,
      randomSampler,
      core: core.setup,
      logger,
    });
  },
});

const agentExplorerDetailsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/agent_explorer/{serviceName}/agent_instance_details',
  options: { tags: ['access:apm'] },
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      kueryRt,
      rangeRt,
      probabilityRt,
    ]),
  }),
  async handler(resources): Promise<{
    items: Array<{
      agentId: string;
      environments: string[];
      agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
      agentVersion: string;
      lastReport: string;
    }>;
  }> {
    const {
      params,
      request,
      plugins: { security },
    } = resources;

    const {
      kuery,
      start,
      end,
      probability,
    } = params.query;

    const {
      serviceName,
    } = params.path;

    const [setup, randomSampler] = await Promise.all([
      setupRequest(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    return getAgentsInstances({
      serviceName,
      kuery,
      setup,
      start,
      end,
      randomSampler,
    });
  },
});

export const agentExplorerRouteRepository = {
  ...agentExplorerRoute,
  ...agentExplorerDetailsRoute,
};
