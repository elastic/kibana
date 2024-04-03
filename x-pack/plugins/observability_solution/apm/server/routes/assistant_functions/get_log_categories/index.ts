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
    { field: SERVICE_NAME, value: args['service.name'] },
    { field: CONTAINER_ID, value: args['container.id'] },
    { field: HOST_NAME, value: args['host.name'] },
  ]);

  const index =
    (await coreContext.uiSettings.client.get<string>(
      aiAssistantLogsIndexPattern
    )) ?? 'logs-*';

  const search = getTypedSearch(esClient);
  const res = await search({
    index,
    size: 0,
    track_total_hits: 0,
    timeout: '5s',
    query: {
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
    },
    aggs: {
      categories: {
        categorize_text: {
          field: 'message',
          size: 500,
        },
      },
    },
  });

  return res.aggregations?.categories?.buckets.map(
    ({ doc_count: docCount, key }) => {
      return { key: key as string, docCount };
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
