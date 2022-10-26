import { AgentName } from "@kbn/apm-plugin/typings/es_schemas/ui/fields/agent";
import { CoreSetup, Logger } from "@kbn/core/server";
import { APMEventClient } from "../../lib/helpers/create_es_client/create_apm_event_client";
import { RandomSampler } from "../../lib/helpers/get_random_sampler";
import { withApmSpan } from "../../utils/with_apm_span";
import { getAgentsItems } from "./get_agents_items";
import { getAgentRepositoryUrl } from "./get_agent_url_repository";

export async function getAgents({
  environment,
  serviceName,
  agentLanguage,
  kuery,
  apmEventClient,
  start,
  end,
  randomSampler,
  core,
  logger,
}: {
  environment: string;
  serviceName?: string;
  agentLanguage?: string;
  kuery: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  randomSampler: RandomSampler;
  core: CoreSetup;
  logger: Logger;
}) {
  return withApmSpan('get_agents', async () => {
    const items = await getAgentsItems({
      environment,
      serviceName,
      agentLanguage,
      kuery,
      apmEventClient,
      start,
      end,
      randomSampler,
    });

    return {
      items: items.map((item) => ({
        ...item,
        agentRepoUrl: getAgentRepositoryUrl(item.agentName as AgentName),
      }))
    };
  });
}
