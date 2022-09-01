/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { CONNECTORS_INDEX } from '../..';
import { ConnectorStatus } from '../../../common/types/connectors';
import { fetchConnectorByIndexName } from '../connectors/fetch_connectors';

import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';

import { createApiIndex } from './create_index';

jest.mock('../../index_management/setup_indices', () => ({
  setupConnectorsIndices: jest.fn(),
}));

jest.mock('../connectors/fetch_connectors', () => ({ fetchConnectorByIndexName: jest.fn() }));
jest.mock('../crawler/fetch_crawlers', () => ({ fetchCrawlerByIndexName: jest.fn() }));

describe('createApiIndex lib function', () => {
  const mockClient = elasticsearchServiceMock.createScopedClusterClient();

  const createConnectorsIndexExistsFn =
    (connectorsIndexExists: boolean, defaultValue: boolean) =>
    ({ index }: { index: string }) =>
      index === CONNECTORS_INDEX ? connectorsIndexExists : defaultValue;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const connectorsIndicesMapping = {
    '.elastic-connectors-v1': {
      mappings: {
        _meta: {
          pipeline: {
            default_extract_binary_content: true,
            default_name: 'ent-search-generic-ingestion',
            default_reduce_whitespace: true,
            default_run_ml_inference: false,
          },
          version: '1',
        },
      },
    },
  };

  it('successfully creates an index', async () => {
    mockClient.asCurrentUser.index.mockImplementation(() => ({ _id: 'fakeId' } as any));
    mockClient.asCurrentUser.indices.exists.mockImplementation(
      createConnectorsIndexExistsFn(true, false) as any
    );
    (fetchConnectorByIndexName as jest.Mock).mockImplementation(() => undefined);
    (fetchCrawlerByIndexName as jest.Mock).mockImplementation(() => undefined);
    mockClient.asCurrentUser.indices.getMapping.mockImplementation(
      async () => connectorsIndicesMapping
    );
    await createApiIndex(mockClient as unknown as IScopedClusterClient, 'index_name', 'en');
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        configuration: {},
        index_name: 'index_name',
        is_native: false,
        language: 'en',
        last_seen: null,
        last_sync_error: null,
        last_sync_status: null,
        last_synced: null,
        name: 'index_name',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        scheduling: { enabled: false, interval: '0 0 0 * * ?' },
        service_type: 'elasticsearch-native',
        status: ConnectorStatus.CREATED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
    });
    expect(mockClient.asCurrentUser.indices.create).toHaveBeenCalledWith({
      body: {
        mappings: {
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
        },
        settings: {
          analysis: {
            analyzer: {
              i_prefix: {
                filter: ['cjk_width', 'lowercase', 'asciifolding', 'front_ngram'],
                tokenizer: 'standard',
                type: 'custom',
              },
              i_text_bigram: {
                filter: [
                  'cjk_width',
                  'lowercase',
                  'asciifolding',
                  'en-stem-filter',
                  'bigram_joiner',
                  'bigram_max_size',
                ],
                tokenizer: 'standard',
                type: 'custom',
              },
              iq_text_base: {
                filter: ['cjk_width', 'lowercase', 'asciifolding', 'en-stop-words-filter'],
                tokenizer: 'standard',
                type: 'custom',
              },
              iq_text_delimiter: {
                filter: [
                  'delimiter',
                  'cjk_width',
                  'lowercase',
                  'asciifolding',
                  'en-stop-words-filter',
                  'en-stem-filter',
                ],
                tokenizer: 'whitespace',
                type: 'custom',
              },
              iq_text_stem: {
                filter: [
                  'cjk_width',
                  'lowercase',
                  'asciifolding',
                  'en-stop-words-filter',
                  'en-stem-filter',
                ],
                tokenizer: 'standard',
                type: 'custom',
              },
              q_prefix: {
                filter: ['cjk_width', 'lowercase', 'asciifolding'],
                tokenizer: 'standard',
                type: 'custom',
              },
              q_text_bigram: {
                filter: [
                  'cjk_width',
                  'lowercase',
                  'asciifolding',
                  'en-stem-filter',
                  'bigram_joiner_unigrams',
                  'bigram_max_size',
                ],
                tokenizer: 'standard',
                type: 'custom',
              },
            },
            filter: {
              bigram_joiner: {
                max_shingle_size: 2,
                output_unigrams: false,
                token_separator: '',
                type: 'shingle',
              },
              bigram_joiner_unigrams: {
                max_shingle_size: 2,
                output_unigrams: true,
                token_separator: '',
                type: 'shingle',
              },
              bigram_max_size: {
                max: 16,
                min: 0,
                type: 'length',
              },
              delimiter: {
                catenate_all: true,
                catenate_numbers: true,
                catenate_words: true,
                generate_number_parts: true,
                generate_word_parts: true,
                preserve_original: false,
                split_on_case_change: true,
                split_on_numerics: true,
                stem_english_possessive: true,
                type: 'word_delimiter_graph',
              },
              'en-stem-filter': {
                name: 'light_english',
                language: 'light_english',
                type: 'stemmer',
              },
              'en-stop-words-filter': {
                stopwords: '_english_',
                type: 'stop',
              },
              front_ngram: {
                max_gram: 12,
                min_gram: 1,
                type: 'edge_ngram',
              },
            },
          },
        },
      },
      index: 'index_name',
    });
  });
});
