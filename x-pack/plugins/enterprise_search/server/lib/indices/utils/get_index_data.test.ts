/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockSingleIndexWithAliasesResponse,
  mockMultiIndexResponse,
} from '../../../__mocks__/fetch_indices.mock';

import { IScopedClusterClient } from '@kbn/core/server';

import { TotalIndexData } from '../fetch_indices';

import { getIndexData, getIndexDataMapper } from './get_index_data';

import * as mapIndexStatsModule from './map_index_stats';

// While we are mocking a lot, there is no good way to check if this works not.
// This tests only check if we call the 'get' api with correct parameters and
// if we re-shape the response accordingly
describe('getIndexData util function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  const mockClient = {
    asCurrentUser: { indices: { get: jest.fn() } },
  };

  it('returns index data with for non-hidden indices', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => {
      return mockSingleIndexWithAliasesResponse;
    });

    const indexData = await getIndexData(
      mockClient as unknown as IScopedClusterClient,
      '*',
      ['open'],
      false,
      false
    );

    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: '*',
    });

    expect(indexData).toEqual({
      allIndexMatches: mockSingleIndexWithAliasesResponse,
      alwaysShowMatchNames: [],
      expandWildcards: ['open'],
      indexAndAliasNames: ['search-regular-index'],
      indicesNames: ['search-regular-index'],
    });
  });

  it('returns index data and aliases for non-hidden indices', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => {
      return mockSingleIndexWithAliasesResponse;
    });

    const indexData = await getIndexData(
      mockClient as unknown as IScopedClusterClient,
      '*',
      ['open'],
      false,
      true
    );

    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['open'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: '*',
    });

    expect(indexData).toEqual({
      allIndexMatches: mockSingleIndexWithAliasesResponse,
      alwaysShowMatchNames: [],
      expandWildcards: ['open'],
      indexAndAliasNames: ['search-regular-index', 'search-alias-1', 'search-alias-2'],
      indicesNames: ['search-regular-index'],
    });
  });

  it('returns index data with hidden indices', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => {
      return mockMultiIndexResponse;
    });

    const indexData = await getIndexData(
      mockClient as unknown as IScopedClusterClient,
      '*',
      ['hidden', 'all'],
      true,
      false
    );

    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['hidden', 'all'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: '*',
    });

    expect(indexData).toEqual({
      allIndexMatches: mockMultiIndexResponse,
      alwaysShowMatchNames: [],
      expandWildcards: ['hidden', 'all'],
      indexAndAliasNames: [
        'hidden-index',
        'regular-index',
        'search-prefixed-hidden-index',
        'search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
        'search-prefixed-.ent-search-engine-documents-12345',
      ],
      indicesNames: [
        'hidden-index',
        'regular-index',
        'search-prefixed-hidden-index',
        'search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
        'search-prefixed-.ent-search-engine-documents-12345',
      ],
    });
  });

  it('returns index data and aliases with hidden indices', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => {
      return mockMultiIndexResponse;
    });

    const indexData = await getIndexData(
      mockClient as unknown as IScopedClusterClient,
      '*',
      ['hidden', 'all'],
      true,
      true
    );

    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['hidden', 'all'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: '*',
    });

    expect(indexData).toEqual({
      allIndexMatches: mockMultiIndexResponse,
      alwaysShowMatchNames: [],
      expandWildcards: ['hidden', 'all'],

      indexAndAliasNames: [
        'hidden-index',
        'alias-hidden-index',
        'search-alias-hidden-index',
        'regular-index',
        'alias-regular-index',
        'search-alias-regular-index',
        'search-prefixed-hidden-index',
        'alias-search-prefixed-hidden-index',
        'search-alias-search-prefixed-hidden-index',
        'search-prefixed-regular-index',
        'alias-search-prefixed-regular-index',
        'search-alias-search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
        'alias-.ent-search-engine-documents-12345',
        'search-alias-.ent-search-engine-documents-12345',
        'search-prefixed-.ent-search-engine-documents-12345',
        'alias-search-prefixed-.ent-search-engine-documents-12345',
        'search-alias-search-prefixed-.ent-search-engine-documents-12345',
      ],
      indicesNames: [
        'hidden-index',
        'regular-index',
        'search-prefixed-hidden-index',
        'search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
        'search-prefixed-.ent-search-engine-documents-12345',
      ],
    });
  });

  // This is a happy path tests for a case where we set all parameter on route
  // There are other possible cases where if you set includeAliases to false and still
  //  pass a 'search-' pattern and '.ent-search-engine-documents'. you will get some weird results back. It won't be false but
  // useless. These will go away on the next iterations we have.
  it('returns non-hidden and alwaysShowPattern matching indices ', async () => {
    mockClient.asCurrentUser.indices.get.mockImplementationOnce(() => {
      return mockMultiIndexResponse;
    });

    const indexData = await getIndexData(
      mockClient as unknown as IScopedClusterClient,
      '*',
      ['hidden', 'all'],
      false,
      true,
      { alias_pattern: 'search-', index_pattern: '.ent-search-engine-documents' }
    );

    expect(mockClient.asCurrentUser.indices.get).toHaveBeenCalledWith({
      expand_wildcards: ['hidden', 'all'],
      features: ['aliases', 'settings'],
      filter_path: ['*.aliases', '*.settings.index.hidden'],
      index: '*',
    });

    expect(indexData).toEqual({
      allIndexMatches: mockMultiIndexResponse,
      alwaysShowMatchNames: [
        'hidden-index',
        'regular-index',
        'search-prefixed-hidden-index',
        'search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
        'search-prefixed-.ent-search-engine-documents-12345',
      ],
      expandWildcards: ['hidden', 'all'],
      indexAndAliasNames: [
        'hidden-index',
        'alias-hidden-index',
        'search-alias-hidden-index',
        'regular-index',
        'alias-regular-index',
        'search-alias-regular-index',
        'search-prefixed-hidden-index',
        'alias-search-prefixed-hidden-index',
        'search-alias-search-prefixed-hidden-index',
        'search-prefixed-regular-index',
        'alias-search-prefixed-regular-index',
        'search-alias-search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
        'alias-.ent-search-engine-documents-12345',
        'search-alias-.ent-search-engine-documents-12345',
        'search-prefixed-.ent-search-engine-documents-12345',
        'alias-search-prefixed-.ent-search-engine-documents-12345',
        'search-alias-search-prefixed-.ent-search-engine-documents-12345',
      ],
      indicesNames: [
        'regular-index',
        'search-prefixed-regular-index',
        '.ent-search-engine-documents-12345',
      ],
    });
  });
});

describe('getIndexDataMapper util function', () => {
  it('returns a function that calls mapIndexStats with parameters set', () => {
    jest.spyOn(mapIndexStatsModule, 'mapIndexStats');

    const mockIndexData: TotalIndexData = {
      allIndexMatches: { 'index-name': { aliases: {} } },
      indexCounts: {},
      indexPrivileges: {},
      indicesStats: { 'index-name': {} },
    };

    const indexDataMapperFunction = getIndexDataMapper(mockIndexData);
    expect(mapIndexStatsModule.mapIndexStats).not.toHaveBeenCalled();
    indexDataMapperFunction('index-name');
    expect(mapIndexStatsModule.mapIndexStats).toHaveBeenCalledWith(
      { aliases: {} },
      {},
      'index-name'
    );
  });
});
