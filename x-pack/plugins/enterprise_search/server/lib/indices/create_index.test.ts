/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { createIndex } from './create_index';
import { textAnalysisSettings } from './text_analysis';

describe('createApiIndex lib function', () => {
  const mockClient = elasticsearchServiceMock.createScopedClusterClient();

  const defaultMappings = {
    dynamic: true,
    dynamic_templates: [
      {
        all_text_fields: {
          mapping: {
            analyzer: 'iq_text_base',
            fields: {
              delimiter: {
                analyzer: 'iq_text_delimiter',
                index_options: 'freqs',
                type: 'text',
              },
              enum: {
                ignore_above: 2048,
                type: 'keyword',
              },
              joined: {
                analyzer: 'i_text_bigram',
                index_options: 'freqs',
                search_analyzer: 'q_text_bigram',
                type: 'text',
              },
              prefix: {
                analyzer: 'i_prefix',
                index_options: 'docs',
                search_analyzer: 'q_prefix',
                type: 'text',
              },
              stem: {
                analyzer: 'iq_text_stem',
                type: 'text',
              },
            },
          },
          match_mapping_type: 'string',
        },
      },
    ],
  };
  const defaultSettings = {
    auto_expand_replicas: '0-3',
    number_of_shards: 2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully creates an index', async () => {
    await expect(createIndex(mockClient, 'index_name', 'en', true)).resolves.toEqual({
      body: {},
      headers: {
        'x-elastic-product': 'Elasticsearch',
      },
      meta: {},
      statusCode: 200,
      warnings: [],
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'index_name',
      mappings: defaultMappings,
      settings: { ...textAnalysisSettings('en'), ...defaultSettings },
    });
  });
  it('successfully creates an index with no mappings in French', async () => {
    await expect(createIndex(mockClient, 'index_name', 'fr', false)).resolves.toEqual({
      body: {},
      headers: {
        'x-elastic-product': 'Elasticsearch',
      },
      meta: {},
      statusCode: 200,
      warnings: [],
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      index: 'index_name',
      mappings: {},
      settings: { ...textAnalysisSettings('fr'), ...defaultSettings },
    });
  });
});
