/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getNextPage } from './get_next_page';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { DETECTION_ENGINE_MAX_PER_PAGE } from '../../../../../common/constants';

describe('getNextPage', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    esClient.search.mockResolvedValue({ hits: { hits: [] } });
  });

  it('throws error when perPage exceeds 10000', () => {
    getNextPage({
      esClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: 10001,
      query: '*:*',
      threatListConfig: { _source: true, fields: undefined },
    }).catch((e) => expect(e.message).toEqual('perPage cannot exceed the size of 10000'));
  });

  it('makes the expected request', () => {
    getNextPage({
      esClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      query: '*:*',
      threatListConfig: { _source: true, fields: undefined },
    });

    expect(esClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        sort: ['_doc', { '@timestamp': 'asc' }],
        _source: true,
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 10000,
    });
  });

  it('can override threatListConfig', () => {
    getNextPage({
      esClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      query: '*:*',
      threatListConfig: { _source: false, fields: ['test-field'] },
    });

    expect(esClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        sort: ['_doc', { '@timestamp': 'asc' }],
        _source: false,
        fields: ['test-field'],
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 10000,
    });
  });

  it('can have a searchAfter value', () => {
    getNextPage({
      esClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: [13371337],
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      query: '*:*',
      threatListConfig: { _source: true, fields: undefined },
    });

    expect(esClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        search_after: [13371337],
        sort: ['_doc', { '@timestamp': 'asc' }],
        _source: true,
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 10000,
    });
  });

  it('can have a custom perPage value', () => {
    getNextPage({
      esClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: 999,
      query: '*:*',
      threatListConfig: { _source: true, fields: undefined },
    });

    expect(esClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        sort: ['_doc', { '@timestamp': 'asc' }],
        _source: true,
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 999,
    });
  });
});
