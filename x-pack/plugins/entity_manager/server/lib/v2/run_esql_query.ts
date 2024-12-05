/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ESQLColumn, ESQLRow, ESQLSearchResponse } from '@kbn/es-types';

export interface SourceAs<T> {
  _source: T;
}

export async function runESQLQuery<T>(
  operationName: string,
  {
    esClient,
    logger,
    query,
    filter,
  }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    query: string;
    filter: QueryDslQueryContainer;
  }
): Promise<T[]> {
  logger.trace(
    () => `Request (${operationName}):\nquery: ${query}\nfilter: ${JSON.stringify(filter, null, 2)}`
  );
  return withSpan(
    { name: operationName, labels: { plugin: '@kbn/entityManager-plugin' } },
    async () =>
      esClient.esql.query(
        {
          query,
          filter,
          format: 'json',
        },
        { querystring: { drop_null_columns: true } }
      )
  )
    .then((response) => {
      logger.trace(() => `Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);

      const esqlResponse = response as unknown as ESQLSearchResponse;

      const documents = esqlResponse.values.map((row) =>
        rowToObject(row, esqlResponse.columns)
      ) as T[];

      return documents;
    })
    .catch((error) => {
      logger.trace(() => `Error (${operationName}):\n${error.message}`);
      throw error;
    });
}

function rowToObject(row: ESQLRow, columns: ESQLColumn[]) {
  return row.reduce<Record<string, any>>((object, value, index) => {
    const column = columns[index];

    if (!column) {
      return object;
    }

    const name = column.name;
    if (!object[name]) {
      object[name] = value;
    }

    return object;
  }, {});
}
