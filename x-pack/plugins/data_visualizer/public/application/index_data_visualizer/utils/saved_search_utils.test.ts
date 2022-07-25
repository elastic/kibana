/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getQueryFromSavedSearchObject,
  createMergedEsQuery,
  getEsQueryFromSavedSearch,
} from './saved_search_utils';
import type { SavedSearchSavedObject } from '../../../../common/types';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import type { Filter, FilterStateStore } from '@kbn/es-query';
import { stubbedSavedObjectIndexPattern } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataView } from '@kbn/data-views-plugin/public';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { uiSettingsServiceMock } from '@kbn/core/public/mocks';

// helper function to create data views
function createMockDataView(id: string) {
  const {
    type,
    version,
    attributes: { timeFieldName, fields, title },
  } = stubbedSavedObjectIndexPattern(id);

  return new DataView({
    spec: {
      id,
      type,
      version,
      timeFieldName,
      fields: JSON.parse(fields),
      title,
      runtimeFieldMap: {},
    },
    fieldFormats: fieldFormatsMock,
    shortDotsEnable: false,
    metaFields: [],
  });
}

const mockDataView = createMockDataView('test-mock-data-view');
const mockUiSettings = uiSettingsServiceMock.createStartContract();

// @ts-expect-error We don't need the full object here
const luceneSavedSearchObj: SavedSearchSavedObject = {
  attributes: {
    title: 'farequote_filter_and_lucene',
    columns: ['_source'],
    sort: ['@timestamp', 'desc'],
    kibanaSavedObjectMeta: {
      searchSourceJSON:
        '{"highlightAll":true,"version":true,"query":{"query":"responsetime:>50","language":"lucene"},"filter":[{"meta":{"index":"90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0","negate":false,"disabled":false,"alias":null,"type":"phrase","key":"airline","value":"ASA","params":{"query":"ASA","type":"phrase"}},"query":{"match":{"airline":{"query":"ASA","type":"phrase"}}},"$state":{"store":"appState"}}],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
  },
  id: '93fc4d60-1c80-11ec-b1d7-f7e5cf21b9e0',
  type: 'search',
};

// @ts-expect-error We don't need the full object here
const luceneInvalidSavedSearchObj: SavedSearchSavedObject = {
  attributes: {
    kibanaSavedObjectMeta: {
      searchSourceJSON: null,
    },
  },
  id: '93fc4d60-1c80-11ec-b1d7-f7e5cf21b9e0',
  type: 'search',
};

const kqlSavedSearch: SavedSearch = {
  title: 'farequote_filter_and_kuery',
  description: '',
  columns: ['_source'],
  // @ts-expect-error this isn't a valid SavedSearch object... but does anyone care?
  kibanaSavedObjectMeta: {
    searchSourceJSON:
      '{"highlightAll":true,"version":true,"query":{"query":"responsetime > 49","language":"kuery"},"filter":[{"meta":{"index":"90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0","negate":false,"disabled":false,"alias":null,"type":"phrase","key":"airline","value":"ASA","params":{"query":"ASA","type":"phrase"}},"query":{"match":{"airline":{"query":"ASA","type":"phrase"}}},"$state":{"store":"appState"}}],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
  },
};

describe('getQueryFromSavedSearchObject()', () => {
  it('should return parsed searchSourceJSON with query and filter', () => {
    expect(getQueryFromSavedSearchObject(luceneSavedSearchObj)).toEqual({
      filter: [
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: '90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0',
            key: 'airline',
            negate: false,
            params: { query: 'ASA', type: 'phrase' },
            type: 'phrase',
            value: 'ASA',
          },
          query: { match: { airline: { query: 'ASA', type: 'phrase' } } },
        },
      ],
      highlightAll: true,
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      query: { language: 'lucene', query: 'responsetime:>50' },
      version: true,
    });
    expect(getQueryFromSavedSearchObject(kqlSavedSearch)).toEqual({
      filter: [
        {
          $state: { store: 'appState' },
          meta: {
            alias: null,
            disabled: false,
            index: '90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0',
            key: 'airline',
            negate: false,
            params: { query: 'ASA', type: 'phrase' },
            type: 'phrase',
            value: 'ASA',
          },
          query: { match: { airline: { query: 'ASA', type: 'phrase' } } },
        },
      ],
      highlightAll: true,
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      query: { language: 'kuery', query: 'responsetime > 49' },
      version: true,
    });
  });
  it('should return undefined if invalid searchSourceJSON', () => {
    expect(getQueryFromSavedSearchObject(luceneInvalidSavedSearchObj)).toEqual(undefined);
  });
});

describe('createMergedEsQuery()', () => {
  const luceneQuery = {
    query: 'responsetime:>50',
    language: 'lucene',
  };
  const kqlQuery = {
    query: 'responsetime > 49',
    language: 'kuery',
  };
  const mockFilters: Filter[] = [
    {
      meta: {
        index: '90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0',
        negate: false,
        disabled: false,
        alias: null,
        type: 'phrase',
        key: 'airline',
        params: {
          query: 'ASA',
        },
      },
      query: {
        match: {
          airline: {
            query: 'ASA',
            type: 'phrase',
          },
        },
      },
      $state: {
        store: 'appState' as FilterStateStore,
      },
    },
  ];

  it('return formatted ES bool query with both the original query and filters combined', () => {
    expect(createMergedEsQuery(luceneQuery, mockFilters)).toEqual({
      bool: {
        filter: [{ match_phrase: { airline: { query: 'ASA' } } }],
        must: [{ query_string: { query: 'responsetime:>50' } }],
        must_not: [],
        should: [],
      },
    });
    expect(createMergedEsQuery(kqlQuery, mockFilters)).toEqual({
      bool: {
        filter: [{ match_phrase: { airline: { query: 'ASA' } } }],
        minimum_should_match: 1,
        must_not: [],
        should: [{ range: { responsetime: { gt: '49' } } }],
      },
    });
  });
  it('return formatted ES bool query without filters ', () => {
    expect(createMergedEsQuery(luceneQuery)).toEqual({
      bool: {
        filter: [],
        must: [{ query_string: { query: 'responsetime:>50' } }],
        must_not: [],
        should: [],
      },
    });
    expect(createMergedEsQuery(kqlQuery)).toEqual({
      bool: {
        filter: [],
        minimum_should_match: 1,
        must_not: [],
        should: [{ range: { responsetime: { gt: '49' } } }],
      },
    });
  });
});

describe('getEsQueryFromSavedSearch()', () => {
  it('return undefined if saved search is not provided', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: undefined,
        uiSettings: mockUiSettings,
      })
    ).toEqual(undefined);
  });
  it('return search data from saved search if neither query nor filter is provided ', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: luceneSavedSearchObj,
        uiSettings: mockUiSettings,
      })
    ).toEqual({
      queryLanguage: 'lucene',
      searchQuery: {
        bool: {
          filter: [{ match_phrase: { airline: { query: 'ASA' } } }],
          must: [{ query_string: { query: 'responsetime:>50' } }],
          must_not: [],
          should: [],
        },
      },
      searchString: 'responsetime:>50',
    });
  });
  it('should override original saved search with the provided query ', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: luceneSavedSearchObj,
        uiSettings: mockUiSettings,
        query: {
          query: 'responsetime:>100',
          language: 'lucene',
        },
      })
    ).toEqual({
      queryLanguage: 'lucene',
      searchQuery: {
        bool: {
          filter: [{ match_phrase: { airline: { query: 'ASA' } } }],
          must: [{ query_string: { query: 'responsetime:>100' } }],
          must_not: [],
          should: [],
        },
      },
      searchString: 'responsetime:>100',
    });
  });

  it('should override original saved search with the provided filters ', () => {
    expect(
      getEsQueryFromSavedSearch({
        dataView: mockDataView,
        savedSearch: luceneSavedSearchObj,
        uiSettings: mockUiSettings,
        query: {
          query: 'responsetime:>100',
          language: 'lucene',
        },
        filters: [
          {
            meta: {
              index: '90a978e0-1c80-11ec-b1d7-f7e5cf21b9e0',
              alias: null,
              negate: true,
              disabled: false,
              type: 'phrase',
              key: 'airline',
              params: {
                query: 'JZA',
              },
            },
            query: {
              match_phrase: {
                airline: 'JZA',
              },
            },
            $state: {
              store: 'appState' as FilterStateStore,
            },
          },
        ],
      })
    ).toEqual({
      queryLanguage: 'lucene',
      searchQuery: {
        bool: {
          filter: [],
          must: [{ query_string: { query: 'responsetime:>100' } }],
          must_not: [{ match_phrase: { airline: 'JZA' } }],
          should: [],
        },
      },
      searchString: 'responsetime:>100',
    });
  });
});
