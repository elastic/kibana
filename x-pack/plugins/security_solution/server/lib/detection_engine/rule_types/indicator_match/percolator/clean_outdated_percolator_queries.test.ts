/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { cleanOutdatedPercolatorQueries } from './clean_outdated_percolator_queries';
import { mockRuleId, mockRuleVersion } from './mocks';

describe('cleanOutdatedPercolatorQueries', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const percolatorIndexName = 'mock-percolator-index-name';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes expected query', () => {
    cleanOutdatedPercolatorQueries({
      esClient,
      percolatorIndexName,
      ruleId: mockRuleId,
      ruleVersion: mockRuleVersion,
    });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: percolatorIndexName,
      body: {
        query: {
          bool: {
            should: [
              {
                match: {
                  rule_id: mockRuleId,
                },
              },
              {
                range: {
                  rule_version: {
                    gt: 0,
                    lt: mockRuleVersion,
                  },
                },
              },
            ],
            minimum_should_match: 2,
          },
        },
      },
    });
  });
});
