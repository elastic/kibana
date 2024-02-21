/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityHasPrivilegesPrivileges } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchIndex } from '@kbn/search-connectors';

import { expandAliases, getAlwaysShowAliases } from './extract_always_show_indices';

describe('getAlwaysShowAliases util function', () => {
  it('returns empty array if names that match with override pattern is empty', () => {
    const mockIndexAndAliasNames: string[] = ['index-1', 'alias-1', 'index-2', 'alias-2'];
    const mockAlwaysShowNames: string[] = [];

    const aliases = getAlwaysShowAliases(mockIndexAndAliasNames, mockAlwaysShowNames);

    expect(aliases).toEqual([]);
  });

  it('returns names that are NOT already included with index and alias names', () => {
    const mockIndexAndAliasNames: string[] = ['index-1', 'alias-1', 'index-2', 'alias-2'];
    const mockAlwaysShowNames: string[] = ['index-1', 'search-not-included'];

    const aliases = getAlwaysShowAliases(mockIndexAndAliasNames, mockAlwaysShowNames);

    expect(aliases).toEqual(['search-not-included']);
  });
});

describe('expandAliases util function', () => {
  const mockIndexName = 'mock-index';
  const mockAliases = ['alias-1', 'search-alias-2', 'alias-with-missing-data'];
  const mockIndex: Omit<ElasticsearchIndex, 'name' | 'aliases' | 'count'> = {
    hidden: false,
    total: {
      docs: {
        count: 200, // Lucene count
        deleted: 0,
      },
      store: {
        size_in_bytes: '100Kb',
      },
    },
  };

  const mockIndicesData: {
    indexCounts: Record<string, number>;
    indexPrivileges: Record<string, SecurityHasPrivilegesPrivileges>;
  } = {
    indexCounts: { 'alias-1': 100, 'search-alias-2': 100 },
    indexPrivileges: {
      'alias-1': { manage: true, read: true },
      'mock-index': { manage: true, read: true },
      'search-alias-2': { manage: true, read: true },
    },
  };

  it('expands an alias with index data when no pattern passed', () => {
    const expandedAliasList = expandAliases(mockIndexName, mockAliases, mockIndex, mockIndicesData);

    expect(expandedAliasList).toEqual([
      {
        alias: true,
        count: 100,
        name: 'alias-1',
        privileges: { manage: true, read: true },
        ...mockIndex,
      },
      {
        alias: true,
        count: 100,
        name: 'search-alias-2',
        privileges: { manage: true, read: true },
        ...mockIndex,
      },
      {
        alias: true,
        count: 0,
        name: 'alias-with-missing-data',
        privileges: { manage: true, read: true },
        ...mockIndex,
      },
    ]);
  });

  it('expands only aliases that starts with alwaysShowPattern', () => {
    const expandedAliasList = expandAliases(
      mockIndexName,
      mockAliases,
      mockIndex,
      mockIndicesData,
      { alias_pattern: 'search-', index_pattern: '.ent-search-engine-documents' }
    );

    expect(expandedAliasList).toEqual([
      {
        alias: true,
        count: 100,
        name: 'search-alias-2',
        privileges: { manage: true, read: true },
        ...mockIndex,
      },
    ]);
  });
});
