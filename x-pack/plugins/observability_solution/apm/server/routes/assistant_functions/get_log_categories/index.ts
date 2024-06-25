/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreRequestHandlerContext } from '@kbn/core/server';
import { aiAssistantLogsIndexPattern } from '@kbn/observability-ai-assistant-plugin/server';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import {
  SERVICE_NAME,
  CONTAINER_ID,
  HOST_NAME,
  KUBERNETES_POD_NAME,
  PROCESSOR_EVENT,
  TRACE_ID,
} from '../../../../common/es_fields/apm';
import { getTypedSearch } from '../../../utils/create_typed_es_client';
import { getDownstreamServiceResource } from '../get_observability_alert_details_context/get_downstream_dependency_name';

export interface LogCategory {
  errorCategory: string;
  docCount: number;
  sampleMessage: string;
  downstreamServiceResource?: string;
}

export async function getLogCategories({
  apmEventClient,
  esClient,
  coreContext,
  arguments: args,
}: {
  apmEventClient: APMEventClient;
  esClient: ElasticsearchClient;
  coreContext: Pick<CoreRequestHandlerContext, 'uiSettings'>;
  arguments: {
    start: string;
    end: string;
    'service.name'?: string;
    'host.name'?: string;
    'container.id'?: string;
    'kubernetes.pod.name'?: string;
  };
}): Promise<LogCategory[] | undefined> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const keyValueFilters = getShouldMatchOrNotExistFilter([
    { field: SERVICE_NAME, value: args[SERVICE_NAME] },
    { field: CONTAINER_ID, value: args[CONTAINER_ID] },
    { field: HOST_NAME, value: args[HOST_NAME] },
    { field: KUBERNETES_POD_NAME, value: args[KUBERNETES_POD_NAME] },
  ]);

  const index = await coreContext.uiSettings.client.get<string>(aiAssistantLogsIndexPattern);

  const search = getTypedSearch(esClient);

  const query = {
    bool: {
      must_not: [
        // exclude APM errors
        { term: { [PROCESSOR_EVENT]: 'error' } },
      ],
      filter: [
        ...keyValueFilters,
        { exists: { field: 'message' } },
        {
          range: {
            '@timestamp': {
              gte: start,
              lte: end,
            },
          },
        },
      ],
    },
  };

  const hitCountRes = await search({
    index,
    size: 0,
    track_total_hits: true,
    query,
  });
  const totalDocCount = hitCountRes.hits.total.value;
  const rawSamplingProbability = Math.min(100_000 / totalDocCount, 1);
  const samplingProbability = rawSamplingProbability < 0.5 ? rawSamplingProbability : 1;

  const categorizedLogsRes = await search({
    index,
    size: 0,
    track_total_hits: 0,
    query,
    aggs: {
      sampling: {
        random_sampler: {
          probability: samplingProbability,
        },
        aggs: {
          categories: {
            categorize_text: {
              field: 'message',
              size: 500,
            },
            aggs: {
              sample: {
                top_hits: {
                  sort: { '@timestamp': 'desc' as const },
                  size: 1,
                  _source: ['message', TRACE_ID],
                },
              },
            },
          },
        },
      },
    },
  });

  const promises = categorizedLogsRes.aggregations?.sampling.categories?.buckets.map(
    async ({ doc_count: docCount, key, sample }) => {
      const hit = sample.hits.hits[0]._source as { message: string; trace?: { id: string } };
      const sampleMessage = hit?.message;
      const sampleTraceId = hit?.trace?.id;
      const errorCategory = key as string;

      if (!sampleTraceId) {
        return { errorCategory, docCount, sampleMessage };
      }

      const downstreamServiceResource = await getDownstreamServiceResource({
        traceId: sampleTraceId,
        start,
        end,
        apmEventClient,
      });

      return { errorCategory, docCount, sampleMessage, downstreamServiceResource };
    }
  );

  return Promise.all(promises ?? []);
}

// field/value pairs should match, or the field should not exist
export function getShouldMatchOrNotExistFilter(
  keyValuePairs: Array<{
    field: string;
    value?: string;
  }>
) {
  return keyValuePairs
    .filter(({ value }) => value)
    .map(({ field, value }) => {
      return {
        bool: {
          should: [
            {
              bool: {
                filter: [{ term: { [field]: value } }],
              },
            },
            {
              bool: {
                must_not: {
                  bool: {
                    filter: [{ exists: { field } }],
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      };
    });
}
