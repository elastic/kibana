/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, KibanaResponseFactory, Logger } from 'kibana/server';

export async function getMatchingIndexes(
  indexPattern: string,
  { asCurrentUser }: IScopedClusterClient,
  response: KibanaResponseFactory,
  logger: Logger
) {
  try {
    const indexResults = await asCurrentUser.cat.indices({
      index: indexPattern,
      format: 'JSON',
    });
    const matchingIndexes = indexResults
      .map((indexRecord) => indexRecord.index)
      .filter((indexName) => !!indexName);
    return response.ok({ body: { success: true, matchingIndexes: matchingIndexes as string[] } });
  } catch (error) {
    const errorStatusCode = error.meta?.statusCode;
    if (errorStatusCode === 404) {
      return response.ok({ body: { success: true, matchingIndexes: [] } });
    } else {
      logger.error(error);
      return response.custom({
        body: {
          success: false,
          message: `Error accessing indexes: ${error.meta?.body?.error?.type}`,
        },
        statusCode: 200,
      });
    }
  }
}
