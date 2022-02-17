/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockDatasource } from '../mocks';
import { combineQueryAndFilters, getLayerMetaInfo } from './show_underlying_data';
import { DiscoverStart } from '../../../../../src/plugins/discover/public';

describe('getLayerMetaInfo', () => {
  it('should return error in case of no data', () => {
    expect(
      getLayerMetaInfo(createMockDatasource('testDatasource'), {}, undefined, {} as DiscoverStart)
        .error
    ).toBe('Visualization has no data available to show');
  });
  it('should return error in case of multiple layers', () => {
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        {},
        {
          datatable1: { type: 'datatable', columns: [], rows: [] },
          datatable2: { type: 'datatable', columns: [], rows: [] },
        },
        {} as DiscoverStart
      ).error
    ).toBe('Cannot show underlying data cannot be shown for visualizations with multiple layers');
  });
  it('should return error in case of missing activeDatasource', () => {
    expect(getLayerMetaInfo(undefined, {}, undefined, {} as DiscoverStart).error).toBe(
      'Visualization has no data available to show'
    );
  });
  it('should return error in case of missing configuration/state', () => {
    expect(
      getLayerMetaInfo(createMockDatasource('testDatasource'), undefined, {}, {} as DiscoverStart)
        .error
    ).toBe('Visualization has no data available to show');
  });
  it('should not be visible if discover is not available', () => {
    expect(
      getLayerMetaInfo(
        createMockDatasource('testDatasource'),
        {},
        {
          datatable1: { type: 'datatable', columns: [], rows: [] },
        },
        undefined
      ).isVisible
    ).toBeFalsy();
  });
  it.todo('should basically work collecting fields and filters in the visualization');
});
describe('combineQueryAndFilters', () => {
  it('should just return same query and filters if no fields or filters are in layer meta', () => {
    expect(
      combineQueryAndFilters(
        { language: 'kuery', query: 'myfield: *' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: { kuery: [], lucene: [] },
        },
        undefined
      )
    ).toEqual({ query: { language: 'kuery', query: 'myfield: *' }, filters: [] });
  });

  it('should concatenate filters with existing query if languages match (AND it)', () => {
    expect(
      combineQueryAndFilters(
        { language: 'kuery', query: 'myfield: *' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: { kuery: [[{ language: 'kuery', query: 'otherField: *' }]], lucene: [] },
        },
        undefined
      )
    ).toEqual({
      query: { language: 'kuery', query: '( myfield: * ) AND ( otherField: * )' },
      filters: [],
    });
  });

  it('should build single kuery expression from meta filters and assign it as query for final use', () => {
    expect(
      combineQueryAndFilters(
        undefined,
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: { kuery: [[{ language: 'kuery', query: 'otherField: *' }]], lucene: [] },
        },
        undefined
      )
    ).toEqual({ query: { language: 'kuery', query: '( otherField: * )' }, filters: [] });
  });

  it('should build single kuery expression from meta filters and join using OR and AND at the right level', () => {
    // OR queries from the same array, AND queries from different arrays
    expect(
      combineQueryAndFilters(
        undefined,
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            kuery: [
              [
                { language: 'kuery', query: 'myfield: *' },
                { language: 'kuery', query: 'otherField: *' },
              ],
              [
                { language: 'kuery', query: 'myfieldCopy: *' },
                { language: 'kuery', query: 'otherFieldCopy: *' },
              ],
            ],
            lucene: [],
          },
        },
        undefined
      )
    ).toEqual({
      query: {
        language: 'kuery',
        query:
          '( ( ( myfield: * ) OR ( otherField: * ) ) AND ( ( myfieldCopy: * ) OR ( otherFieldCopy: * ) ) )',
      },
      filters: [],
    });
  });
  it('should assign kuery meta filters to app filters if existing query is using lucene language', () => {
    expect(
      combineQueryAndFilters(
        { language: 'lucene', query: 'myField' },
        [],
        {
          id: 'testDatasource',
          columns: [],
          filters: {
            kuery: [[{ language: 'kuery', query: 'myfield: *' }]],
            lucene: [],
          },
        },
        undefined
      )
    ).toEqual({
      query: { language: 'lucene', query: 'myField' },
      filters: [
        {
          $state: {
            store: 'appState',
          },
          bool: {
            filter: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      exists: {
                        field: 'myfield',
                      },
                    },
                  ],
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
          meta: {
            alias: 'Lens context (kuery)',
            disabled: false,
            index: 'testDatasource',
            negate: false,
            type: 'custom',
          },
        },
      ],
    });
  });
  it.todo(
    'should append lucene meta filters to app filters even if existing filters are using kuery'
  );
  it.todo('should work for complex cases of nested meta filters');
  it.todo('should append lucene meta filters to an existing lucene query');
});
