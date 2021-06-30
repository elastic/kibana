/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { SearchRequest } from '@elastic/elasticsearch/api/types';

/**
 * Utility to facilitate looping through an index's data using `.search` method
 * until it has read the entire thing
 *
 * @param esClient
 * @param query
 * @param pageSize
 */
export const searchUntilEmpty = async <T>(
  esClient: ElasticsearchClient,
  query: SearchRequest,
  pageSize: number = 1000
): Promise<T[]> => {
  const results: T[] = [];

  for (let i = 0; ; i++) {
    const result = await esClient.search<T>(
      {
        size: pageSize,
        from: i * pageSize,
        ...query,
      },
      {
        ignore: [404],
      }
    );
    if (!result || !result.body?.hits?.hits || result.body?.hits?.hits?.length === 0) {
      break;
    }

    const response = result.body?.hits?.hits?.map((a) => a._source!) || [];
    results.push(...response);
  }

  return results;
};
