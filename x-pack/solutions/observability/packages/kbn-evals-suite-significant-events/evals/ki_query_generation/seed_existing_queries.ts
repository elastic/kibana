/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ExistingQuerySummary } from '@kbn/nightshift-ai';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../../src/data_generators/snapshot_indices';

export const seedExistingQueries = async ({
  esClient,
  streamName,
  existingQueries,
}: {
  esClient: Client;
  streamName: string;
  existingQueries: ExistingQuerySummary[];
}): Promise<void> => {
  await esClient
    .deleteByQuery({
      index: KNOWLEDGE_INDICATORS_DATA_STREAM,
      query: {
        bool: {
          filter: [{ term: { type: 'query' } }, { term: { 'stream.name': streamName } }],
        },
      },
      refresh: true,
      conflicts: 'proceed',
    })
    .catch((error: { statusCode?: number }) => {
      if (error.statusCode !== 404) {
        throw error;
      }
    });

  if (existingQueries.length === 0) {
    return;
  }

  const response = await esClient.bulk({
    refresh: true,
    operations: existingQueries.flatMap((query) => [
      { create: { _index: KNOWLEDGE_INDICATORS_DATA_STREAM } },
      {
        '@timestamp': new Date().toISOString(),
        id: query.id,
        type: 'query',
        title: query.title,
        description: query.description,
        'stream.name': streamName,
        query: {
          esql: query.esql,
          query_type: query.type,
          severity_score: query.severity_score,
          rule_backed: false,
          features: [],
        },
      },
    ]),
  });

  if (response.errors) {
    const firstError = response.items.find((item) => item.create?.error)?.create?.error;
    throw new Error(`Existing-query seed failed: ${JSON.stringify(firstError)}`);
  }
};
