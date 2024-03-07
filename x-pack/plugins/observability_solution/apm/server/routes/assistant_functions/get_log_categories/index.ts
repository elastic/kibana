/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getTypedSearch } from '../../diagnostics/create_typed_es_client';

export type LogCategories =
  | Array<{
      key: string;
      docCount: number;
    }>
  | undefined;

export async function getLogCategories({
  esClient,
  arguments: args,
}: {
  esClient: ElasticsearchClient;
  arguments: {
    start: string;
    end: string;
  };
}): Promise<LogCategories> {
  const start = datemath.parse(args.start)?.valueOf()!;
  const end = datemath.parse(args.end)?.valueOf()!;

  const search = getTypedSearch(esClient);
  const res = await search({
    index: '*:logs-*,logs-*,*:filebeat*,filebeat*', // TODO: make this configurable somehow (UI, kibana config?)
    size: 0,
    track_total_hits: 0,
    timeout: '5s',
    query: {
      bool: {
        filter: [
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
