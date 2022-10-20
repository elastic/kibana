/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { Filter, EsQueryConfig, FilterStateStore } from '@kbn/es-query';

import { DataProviderType } from '../../../common/types/timeline';
import {
  buildGlobalQuery,
  combineQueries,
  getDefaultViewSelection,
  isSelectableView,
  isViewSelection,
  resolverIsShowing,
} from './helpers';
import { mockBrowserFields, mockDataProviders, mockIndexPattern } from '../../mock';
import { TableId } from '../../types';

const cleanUpKqlQuery = (str: string) => str.replace(/\n/g, '').replace(/\s\s+/g, ' ');

describe('Build KQL Query', () => {
  test('Build KQL query with one data provider', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1"');
  });

  test('Build KQL query with one template data provider', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].type = DataProviderType.template;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name :*');
  });

  test('Build KQL query with one disabled data provider', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].enabled = false;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('');
  });

  test('Build KQL query with one data provider as timestamp (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('@timestamp: 1521848183232');
  });

  test('Buld KQL query with one data provider as timestamp (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('@timestamp: 1521848183232');
  });

  test('Buld KQL query with one data provider as timestamp (numeric input as string)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = '1521848183232';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('@timestamp: 1521848183232');
  });

  test('Build KQL query with one data provider as date type (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('event.end: 1521848183232');
  });

  test('Buld KQL query with one data provider as date type (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('event.end: 1521848183232');
  });

  test('Buld KQL query with one data provider as date type (numeric input as string)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = '1521848183232';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('event.end: 1521848183232');
  });

  test('Build KQL query with two data provider', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('(name : "Provider 1") or (name : "Provider 2")');
  });

  test('Build KQL query with two data provider and first is disabled', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].enabled = false;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 2"');
  });

  test('Build KQL query with two data provider and second is disabled', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[1].enabled = false;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1"');
  });

  test('Build KQL query with two data provider (first is template)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].type = DataProviderType.template;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('(name :*) or (name : "Provider 2")');
  });

  test('Build KQL query with two data provider (second is template)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[1].type = DataProviderType.template;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('(name : "Provider 1") or (name :*)');
  });

  test('Build KQL query with one data provider and one and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1" and name : "Provider 2"');
  });

  test('Build KQL query with one disabled data provider and one and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].enabled = false;
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 2"');
  });

  test('Build KQL query with one data provider and one and as timestamp (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = '@timestamp';
    dataProviders[0].and[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1" and @timestamp: 1521848183232');
  });

  test('Build KQL query with one data provider and one and as timestamp (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = '@timestamp';
    dataProviders[0].and[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1" and @timestamp: 1521848183232');
  });

  test('Build KQL query with one data provider and one and as date type (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = 'event.end';
    dataProviders[0].and[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1" and event.end: 1521848183232');
  });

  test('Build KQL query with one data provider and one and as date type (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(1, 2));
    dataProviders[0].and[0].queryMatch.field = 'event.end';
    dataProviders[0].and[0].queryMatch.value = 1521848183232;
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual('name : "Provider 1" and event.end: 1521848183232');
  });

  test('Build KQL query with two data provider and multiple and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(2, 4));
    dataProviders[1].and = cloneDeep(mockDataProviders.slice(4, 5));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '(name : "Provider 1" and name : "Provider 3" and name : "Provider 4") or (name : "Provider 2" and name : "Provider 5")'
    );
  });

  test('Build KQL query with two data provider and multiple and and first data provider is disabled', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].enabled = false;
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(2, 4));
    dataProviders[1].and = cloneDeep(mockDataProviders.slice(4, 5));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '(name : "Provider 3" and name : "Provider 4") or (name : "Provider 2" and name : "Provider 5")'
    );
  });

  test('Build KQL query with two data provider and multiple and and first and provider is disabled', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(2, 4));
    dataProviders[0].and[0].enabled = false;
    dataProviders[1].and = cloneDeep(mockDataProviders.slice(4, 5));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '(name : "Provider 1" and name : "Provider 4") or (name : "Provider 2" and name : "Provider 5")'
    );
  });

  test('Build KQL query with all data provider', () => {
    const kqlQuery = buildGlobalQuery(mockDataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '(name : "Provider 1") or (name : "Provider 2") or (name : "Provider 3") or (name : "Provider 4") or (name : "Provider 5") or (name : "Provider 6") or (name : "Provider 7") or (name : "Provider 8") or (name : "Provider 9") or (name : "Provider 10")'
    );
  });

  test('Build complex KQL query with and and or', () => {
    const dataProviders = cloneDeep(mockDataProviders);
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(2, 4));
    dataProviders[1].and = cloneDeep(mockDataProviders.slice(4, 5));
    const kqlQuery = buildGlobalQuery(dataProviders, mockBrowserFields);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '(name : "Provider 1" and name : "Provider 3" and name : "Provider 4") or (name : "Provider 2" and name : "Provider 5") or (name : "Provider 3") or (name : "Provider 4") or (name : "Provider 5") or (name : "Provider 6") or (name : "Provider 7") or (name : "Provider 8") or (name : "Provider 9") or (name : "Provider 10")'
    );
  });
});

describe('Combined Queries', () => {
  const config: EsQueryConfig = {
    allowLeadingWildcards: true,
    queryStringOptions: {},
    ignoreFilterIfFieldNotInIndex: true,
    dateFormatTZ: 'America/New_York',
  };
  test('No Data Provider & No kqlQuery', () => {
    expect(
      combineQueries({
        config,
        dataProviders: [],
        indexPattern: mockIndexPattern,
        browserFields: mockBrowserFields,
        filters: [],
        kqlQuery: { query: '', language: 'kuery' },
        kqlMode: 'search',
      })
    ).toBeNull();
  });

  test('No Data Provider & No kqlQuery & with Filters', () => {
    expect(
      combineQueries({
        config,
        dataProviders: [],
        indexPattern: mockIndexPattern,
        browserFields: mockBrowserFields,
        filters: [
          {
            $state: { store: FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: 'event.category',
              negate: false,
              params: { query: 'file' },
              type: 'phrase',
            },
            query: { match_phrase: { 'event.category': 'file' } },
          },
          {
            $state: { store: FilterStateStore.APP_STATE },
            meta: {
              alias: null,
              disabled: false,
              key: 'host.name',
              negate: false,
              type: 'exists',
              value: 'exists',
            },
            query: { exists: { field: 'host.name' } },
          } as Filter,
        ],
        kqlQuery: { query: '', language: 'kuery' },
        kqlMode: 'search',
      })
    ).toEqual({
      filterQuery:
        '{"bool":{"must":[],"filter":[{"exists":{"field":"host.name"}}],"should":[],"must_not":[]}}',
    });
  });

  test('Only Data Provider', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toEqual(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match_phrase":{"name":"Provider 1"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}'
    );
  });

  test('Only Data Provider with timestamp (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"range\\":{\\"@timestamp\\":{\\"gte\\":\\"1521848183232\\",\\"lte\\":\\"1521848183232\\"}}}],\\"minimum_should_match\\":1}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Only Data Provider with timestamp (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = '@timestamp';
    dataProviders[0].queryMatch.value = 1521848183232;
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"range\\":{\\"@timestamp\\":{\\"gte\\":\\"1521848183232\\",\\"lte\\":\\"1521848183232\\"}}}],\\"minimum_should_match\\":1}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Only Data Provider with a date type (string input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = '2018-03-23T23:36:23.232Z';
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"event.end\\":\\"1521848183232\\"}}],\\"minimum_should_match\\":1}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Only Data Provider with date type (numeric input)', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].queryMatch.field = 'event.end';
    dataProviders[0].queryMatch.value = 1521848183232;
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"event.end\\":\\"1521848183232\\"}}],\\"minimum_should_match\\":1}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Only KQL search/filter query', () => {
    const { filterQuery } = combineQueries({
      config,
      dataProviders: [],
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: 'host.name: "host-1"', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toEqual(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}'
    );
  });

  test('Data Provider & KQL search query', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: 'host.name: "host-1"', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toEqual(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"bool":{"should":[{"match_phrase":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}'
    );
  });

  test('Data Provider & KQL filter query', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: 'host.name: "host-1"', language: 'kuery' },
      kqlMode: 'filter',
    })!;
    expect(filterQuery).toEqual(
      '{"bool":{"must":[],"filter":[{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}]}}],"should":[],"must_not":[]}}'
    );
  });

  test('Data Provider & KQL search query multiple', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(2, 4));
    dataProviders[1].and = cloneDeep(mockDataProviders.slice(4, 5));
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: 'host.name: "host-1"', language: 'kuery' },
      kqlMode: 'search',
    })!;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 1\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 3\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 4\\"}}],\\"minimum_should_match\\":1}}]}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 2\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 5\\"}}],\\"minimum_should_match\\":1}}]}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"host.name\\":\\"host-1\\"}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Data Provider & KQL filter query multiple', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].and = cloneDeep(mockDataProviders.slice(2, 4));
    dataProviders[1].and = cloneDeep(mockDataProviders.slice(4, 5));
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: 'host.name: "host-1"', language: 'kuery' },
      kqlMode: 'filter',
    })!;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 1\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 3\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 4\\"}}],\\"minimum_should_match\\":1}}]}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 2\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 5\\"}}],\\"minimum_should_match\\":1}}]}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"host.name\\":\\"host-1\\"}}],\\"minimum_should_match\\":1}}]}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Data Provider & kql filter query with nested field that exists', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    const query = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'exists',
            key: 'nestedField.firstAttributes',
            value: 'exists',
          },
          query: {
            exists: {
              field: 'nestedField.firstAttributes',
            },
          },
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        } as Filter,
      ],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'filter',
    });
    const filterQuery = query && query.filterQuery;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 1\\"}}],\\"minimum_should_match\\":1}},{\\"exists\\":{\\"field\\":\\"nestedField.firstAttributes\\"}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Data Provider & kql filter query with nested field of a particular value', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    const query = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            alias: null,
            disabled: false,
            key: 'nestedField.secondAttributes',
            negate: false,
            params: { query: 'test' },
            type: 'phrase',
          },
          query: { match_phrase: { 'nestedField.secondAttributes': 'test' } },
        },
      ],
      kqlQuery: { query: '', language: 'kuery' },
      kqlMode: 'filter',
    });
    const filterQuery = query && query.filterQuery;
    expect(filterQuery).toMatchInlineSnapshot(
      `"{\\"bool\\":{\\"must\\":[],\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"name\\":\\"Provider 1\\"}}],\\"minimum_should_match\\":1}},{\\"match_phrase\\":{\\"nestedField.secondAttributes\\":\\"test\\"}}],\\"should\\":[],\\"must_not\\":[]}}"`
    );
  });

  test('Disabled Data Provider and kqlQuery', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].enabled = false;
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '_id:*', language: 'kuery' },
      kqlMode: 'search',
    })!;

    const expectQueryString = JSON.stringify({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              should: [
                {
                  exists: {
                    field: '_id',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });

    expect(filterQuery).toStrictEqual(expectQueryString);
  });

  test('Both disabled & enabled data provider and kqlQuery', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].enabled = false;
    const { filterQuery } = combineQueries({
      config,
      dataProviders,
      indexPattern: mockIndexPattern,
      browserFields: mockBrowserFields,
      filters: [],
      kqlQuery: { query: '_id:*', language: 'kuery' },
      kqlMode: 'search',
    })!;

    const expectQueryString = JSON.stringify({
      bool: {
        must: [],
        filter: [
          {
            bool: {
              should: [
                {
                  bool: {
                    should: [
                      {
                        match_phrase: {
                          [dataProviders[1].queryMatch.field]: dataProviders[1].queryMatch.value,
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        exists: {
                          field: '_id',
                        },
                      },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        ],
        should: [],
        must_not: [],
      },
    });

    expect(filterQuery).toStrictEqual(expectQueryString);
  });

  describe('resolverIsShowing', () => {
    test('it returns true when graphEventId is NOT an empty string', () => {
      expect(resolverIsShowing('a valid id')).toBe(true);
    });

    test('it returns false when graphEventId is undefined', () => {
      expect(resolverIsShowing(undefined)).toBe(false);
    });

    test('it returns false when graphEventId is an empty string', () => {
      expect(resolverIsShowing('')).toBe(false);
    });
  });

  describe('view selection', () => {
    const validViewSelections = ['gridView', 'eventRenderedView'];
    const invalidViewSelections = [
      'gRiDvIeW',
      'EvEnTrEnDeReDvIeW',
      'anything else',
      '',
      1234,
      {},
      undefined,
      null,
    ];

    const selectableViews: TableId[] = [
      TableId.alertsOnAlertsPage,
      TableId.alertsOnRuleDetailsPage,
    ];

    const exampleNonSelectableViews: string[] = [
      TableId.hostsPageEvents,
      TableId.usersPageEvents,
      'foozle',
      '',
    ];

    describe('isSelectableView', () => {
      selectableViews.forEach((timelineId) => {
        test(`it returns true (for selectable view) timelineId ${timelineId}`, () => {
          expect(isSelectableView(timelineId)).toBe(true);
        });
      });

      exampleNonSelectableViews.forEach((timelineId) => {
        test(`it returns false (for NON-selectable view) timelineId ${timelineId}`, () => {
          expect(isSelectableView(timelineId)).toBe(false);
        });
      });
    });

    describe('isViewSelection', () => {
      validViewSelections.forEach((value) => {
        test(`it returns true when value is valid: ${value}`, () => {
          expect(isViewSelection(value)).toBe(true);
        });
      });

      invalidViewSelections.forEach((value) => {
        test(`it returns false when value is INvalid: ${value}`, () => {
          expect(isViewSelection(value)).toBe(false);
        });
      });
    });

    describe('getDefaultViewSelection', () => {
      describe('NON-selectable views', () => {
        exampleNonSelectableViews.forEach((timelineId) => {
          describe('given valid values', () => {
            validViewSelections.forEach((value) => {
              test(`it ALWAYS returns 'gridView' for NON-selectable timelineId ${timelineId}, with valid value: ${value}`, () => {
                expect(getDefaultViewSelection({ timelineId, value })).toEqual('gridView');
              });
            });
          });

          describe('given INvalid values', () => {
            invalidViewSelections.forEach((value) => {
              test(`it ALWAYS returns 'gridView' for NON-selectable timelineId ${timelineId}, with INvalid value: ${value}`, () => {
                expect(getDefaultViewSelection({ timelineId, value })).toEqual('gridView');
              });
            });
          });
        });
      });
    });

    describe('selectable views', () => {
      selectableViews.forEach((timelineId) => {
        describe('given valid values', () => {
          validViewSelections.forEach((value) => {
            test(`it returns ${value} for selectable timelineId ${timelineId}, with valid value: ${value}`, () => {
              expect(getDefaultViewSelection({ timelineId, value })).toEqual(value);
            });
          });
        });

        describe('given INvalid values', () => {
          invalidViewSelections.forEach((value) => {
            test(`it ALWAYS returns 'gridView' for selectable timelineId ${timelineId}, with INvalid value: ${value}`, () => {
              expect(getDefaultViewSelection({ timelineId, value })).toEqual('gridView');
            });
          });
        });
      });
    });
  });
});
