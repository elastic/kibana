/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
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
  }: {
    esClient: ElasticsearchClient;
    logger: Logger;
    query: string;
  }
): Promise<T[]> {
  logger.trace(() => `Request (${operationName}):\n${query}`);
  return withSpan(
    { name: operationName, labels: { plugin: '@kbn/entityManager-plugin' } },
    async () =>
      esClient.esql.query(
        {
          query,
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

    // Removes the type suffix from the column name
    const name = column.name.replace(/\.(text|keyword)$/, '');
    if (!object[name]) {
      object[name] = value;
    }

    return object;
  }, {});
}
