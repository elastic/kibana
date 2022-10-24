import { AgentName } from "@kbn/apm-plugin/typings/es_schemas/ui/fields/agent";
import { CoreSetup, Logger } from "@kbn/core/server";
import { RandomSampler } from "../../lib/helpers/get_random_sampler";
import { Setup } from "../../lib/helpers/setup_request";
import { withApmSpan } from "../../utils/with_apm_span";
import { getAgentItems } from "./get_agents_items";
import { getAgentsLatestVersion } from "./get_agents_latest_version";
import { getAgentRepositoryUrl } from "./get_agent_url_repository";

export async function getAgents({
  environment,
  serviceName,
  agentLanguage,
  kuery,
  setup,
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
  setup: Setup;
  start: number;
  end: number;
  randomSampler: RandomSampler;
  core: CoreSetup;
  logger: Logger;
}) {
  return withApmSpan('get_agents', async () => {
    const [agentsLastVersion, items] = await Promise.all([
      getAgentsLatestVersion({core, logger}),
      getAgentItems({
        environment,
        serviceName,
        agentLanguage,
        kuery,
        setup,
        start,
        end,
        randomSampler,
      }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        agentLastVersion: agentsLastVersion[item.agentName as AgentName] as string,
        agentRepoUrl: getAgentRepositoryUrl(item.agentName as AgentName),
      }))
    };
  });
}
