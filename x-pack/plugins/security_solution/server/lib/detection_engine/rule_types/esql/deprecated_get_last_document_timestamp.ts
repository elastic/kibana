/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

type GetLastDocumentTimestamp = (args: {
  query: string;
  requestParams: Record<string, unknown>;
  esClient: ElasticsearchClient;
}) => Promise<string | null>;

import { performEsqlRequest } from './esql_request';

export const getLastDocumentTimestamp: GetLastDocumentTimestamp = async ({
  query,
  requestParams,
  esClient,
}) => {
  try {
    const clearedFromGrouping = query.split('stats')?.[0]?.split('|');
    // remove last pipe command leftovers before stats
    clearedFromGrouping.pop();
    clearedFromGrouping.push('project @timestamp');
    clearedFromGrouping.push('sort @timestamp desc');
    clearedFromGrouping.push('limit 1');

    const transformedQuery = clearedFromGrouping.join(' | ');

    const response = await performEsqlRequest({
      esClient,
      requestParams: { ...requestParams, query: transformedQuery },
    });

    if (response.columns?.[0].name === '@timestamp') {
      console.log('......... transformedQuery', transformedQuery);
      console.log(response.values[0][0]);
      return response.values[0][0];
    }

    return null;
  } catch (e) {
    console.error('ERORR', e);
    return null;
  }
};
