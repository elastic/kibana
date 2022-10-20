import { RandomSampler } from "../../../lib/helpers/get_random_sampler";
import { Setup } from "../../../lib/helpers/setup_request";
import { withApmSpan } from "../../../utils/with_apm_span";
import { getAgentInstancesItems } from "./get_agent_instances_items";

export async function getAgentsInstances({
  serviceName,
  kuery,
  setup,
  start,
  end,
  randomSampler,
}: {
  serviceName: string;
  kuery: string;
  setup: Setup;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_agent_instances', async () => {
    const items = await getAgentInstancesItems({
      serviceName,
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
