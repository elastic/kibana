/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../../src/data_generators/snapshot_indices';
import { seedExistingQueries } from './seed_existing_queries';

describe('seedExistingQueries', () => {
  const deleteByQuery = jest.fn().mockResolvedValue({});
  const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
  const esClient = { deleteByQuery, bulk } as unknown as Client;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces stored queries with rerun fixtures while preserving their ids', async () => {
    await seedExistingQueries({
      esClient,
      streamName: 'logs.test',
      existingQueries: [
        {
          id: 'seed-query',
          title: 'Existing failure',
          type: 'match',
          severity_score: 80,
          description: 'Detects an existing failure',
          esql: 'FROM logs | WHERE message:"failure"',
        },
      ],
    });

    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: KNOWLEDGE_INDICATORS_DATA_STREAM,
        query: {
          bool: {
            filter: [{ term: { type: 'query' } }, { term: { 'stream.name': 'logs.test' } }],
          },
        },
      })
    );
    expect(bulk).toHaveBeenCalledWith({
      refresh: true,
      operations: [
        { create: { _index: KNOWLEDGE_INDICATORS_DATA_STREAM } },
        expect.objectContaining({
          id: 'seed-query',
          type: 'query',
          title: 'Existing failure',
          'stream.name': 'logs.test',
          query: {
            esql: 'FROM logs | WHERE message:"failure"',
            query_type: 'match',
            severity_score: 80,
            rule_backed: false,
            features: [],
          },
        }),
      ],
    });
  });

  it('clears stored queries for a clean arm without indexing replacements', async () => {
    await seedExistingQueries({
      esClient,
      streamName: 'logs.test',
      existingQueries: [],
    });

    expect(deleteByQuery).toHaveBeenCalled();
    expect(bulk).not.toHaveBeenCalled();
  });
});
