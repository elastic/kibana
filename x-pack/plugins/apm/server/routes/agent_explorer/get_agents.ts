import { RandomSampler } from "../../lib/helpers/get_random_sampler";
import { Setup } from "../../lib/helpers/setup_request";
import { withApmSpan } from "../../utils/with_apm_span";
import { getAgentItems } from "./get_agents_items";

export async function getAgents({
  environment,
  serviceName,
  agentName,
  kuery,
  setup,
  start,
  end,
  randomSampler,
}: {
  environment: string;
  serviceName?: string;
  agentName?: string;
  kuery: string;
  setup: Setup;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_agents', async () => {
    const items = await getAgentItems({
      environment,
      serviceName,
      agentName,
      kuery,
      setup,
      start,
      end,
      randomSampler,
    });

    return {
      items,
    };
  });
}
