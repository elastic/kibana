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
  const abortableEsClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    abortableEsClient.search.mockResolvedValue({ body: { hits: { hits: [] } } });
  });

  it('throws error when perPage exceeds 10000', () => {
    getNextPage({
      abortableEsClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: 10001,
      sortOrder: 'desc',
      query: '*:*',
    }).catch((e) => expect(e.message).toEqual('perPage cannot exceed the size of 10000'));
  });

  it('makes the expected request', () => {
    getNextPage({
      abortableEsClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      sortOrder: 'asc',
      query: '*:*',
    });

    expect(abortableEsClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        fields: [{ field: '*', include_unmapped: true }],
        sort: { '@timestamp': 'asc' },
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 10000,
    });
  });

  it('can override @timestamp', () => {
    getNextPage({
      abortableEsClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      query: '*:*',
      sortOrder: 'desc',
      timestampOverride: 'event.ingested',
    });

    expect(abortableEsClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        fields: [{ field: '*', include_unmapped: true }],
        sort: { 'event.ingested': 'desc' },
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 10000,
    });
  });

  it('can have a searchAfter value', () => {
    getNextPage({
      abortableEsClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: [13371337],
      sortOrder: 'asc',
      perPage: DETECTION_ENGINE_MAX_PER_PAGE,
      query: '*:*',
    });

    expect(abortableEsClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        fields: [{ field: '*', include_unmapped: true }],
        sort: { '@timestamp': 'asc' },
        search_after: [13371337],
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 10000,
    });
  });

  it('can have a custom perPage value', () => {
    getNextPage({
      abortableEsClient,
      exceptionItems: [],
      filters: [],
      index: ['test-index'],
      language: 'kuery',
      logDebugMessage: jest.fn(),
      searchAfter: undefined,
      sortOrder: 'desc',
      perPage: 999,
      query: '*:*',
    });

    expect(abortableEsClient.search).toHaveBeenCalledWith({
      body: {
        query: { bool: { must: [], filter: [], should: [], must_not: [] } },
        fields: [{ field: '*', include_unmapped: true }],
        sort: { '@timestamp': 'desc' },
      },
      track_total_hits: false,
      ignore_unavailable: true,
      index: ['test-index'],
      size: 999,
    });
  });
});
