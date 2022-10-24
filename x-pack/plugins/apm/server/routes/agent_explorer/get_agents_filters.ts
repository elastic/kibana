import { AGENT_NAME, AGENT_VERSION, SERVICE_LANGUAGE_NAME, SERVICE_NAME, SERVICE_NODE_NAME } from "@kbn/apm-plugin/common/elasticsearch_fieldnames";
import { environmentQuery } from "@kbn/apm-plugin/common/utils/environment_query";
import { ProcessorEvent } from "@kbn/observability-plugin/common";
import { rangeQuery } from "@kbn/observability-plugin/server";
import { RandomSampler } from "../../lib/helpers/get_random_sampler";
import { Setup } from "../../lib/helpers/setup_request";

const MAX_NUMBER_OF_SERVICES = 500;

export async function getAgentsFilters({
  environment,
  setup,
  start,
  end,
  randomSampler,
}: {
  environment: string;
  setup: Setup;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
const { apmEventClient } = setup;

const response = await apmEventClient.search(
  'get_agents_services',
  {
    apm: {
      events: [ProcessorEvent.metric],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: AGENT_NAME,
              }
            },
            {
              exists: {
                field: AGENT_VERSION,
              }
            },
            {
              exists: {
                field: SERVICE_NODE_NAME,
              }
            },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
          ],
        },
      },
      aggs: {
        sample: {
          random_sampler: randomSampler,
          aggs: {
            services: {
              terms: {
                field: SERVICE_NAME,
                size: MAX_NUMBER_OF_SERVICES,
              },
              aggs: {
                sample: {
                  top_metrics: {
                    metrics: [
                      { field: SERVICE_LANGUAGE_NAME } as const
                    ],
                    sort: {
                      '@timestamp': 'desc' as const,
                    }
                  }
                }
              }
            },
          },
        },
      },
    },
  }
);

return (
  response.aggregations?.sample.services.buckets.reduce((acc, service) => ({
      services: Array.from(new Set([...acc.services, service.key as string])),
      languages: Array.from(new Set([...acc.languages, service.sample.top[0].metrics[SERVICE_LANGUAGE_NAME] as string])),
    }), { services: [], languages: []} as { services: string[]; languages: string[]})
    ?? {
      services: [],
      languages: [],
    }
  );
}
