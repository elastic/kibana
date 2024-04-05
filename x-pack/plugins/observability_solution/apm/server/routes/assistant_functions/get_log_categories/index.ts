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
import {
  SERVICE_NAME,
  CONTAINER_ID,
  HOST_NAME,
} from '../../../../common/es_fields/apm';
import { getTypedSearch } from '../../diagnostics/create_typed_es_client';

export type LogCategories =
  | Array<{
      key: string;
      docCount: number;
      sampleMessage: string;
    }>
  | undefined;

export async function getLogCategories({
  esClient,
  coreContext,
  arguments: args,
}: {
  esClient: ElasticsearchClient;
  coreContext: CoreRequestHandlerContext;
  arguments: {
    start: string;
    end: string;
    'service.name'?: string;
    'host.name'?: string;
    'container.id'?: string;
  };
}): Promise<LogCategories> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const keyValueFilters = getShouldMatchOrNotExistFilter([
    { field: SERVICE_NAME, value: args[SERVICE_NAME] },
    { field: CONTAINER_ID, value: args[CONTAINER_ID] },
    { field: HOST_NAME, value: args[HOST_NAME] },
  ]);

  const index =
    (await coreContext.uiSettings.client.get<string>(
      aiAssistantLogsIndexPattern
    )) ?? 'logs-*';

  const search = getTypedSearch(esClient);

  const query = {
    bool: {
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
  const samplingProbability = Math.min(100_000 / totalDocCount, 1);

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
                  _source: ['message'],
                },
              },
            },
          },
        },
      },
    },
  });

  return categorizedLogsRes.aggregations?.sampling.categories?.buckets.map(
    ({ doc_count: docCount, key, sample }) => {
      const sampleMessage = (sample.hits.hits[0]._source as { message: string })
        .message;
      return { key: key as string, docCount, sampleMessage };
    }
  );
}

// field/value pairs should match, or the field should not exist
function getShouldMatchOrNotExistFilter(
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
