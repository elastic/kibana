/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createSearchItems } from './new_job_utils';
import { fromSavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import type { ISearchSource } from '@kbn/data-plugin/public';

describe('createSearchItems', () => {
  const kibanaConfig = {} as IUiSettingsClient;
  const indexPattern = {
    fields: [],
  } as unknown as DataView;

  const getFieldMock = (searchSource: any) =>
    jest.fn().mockImplementation((name: string) => {
      if (name === 'query') {
        return searchSource.query;
      } else {
        return searchSource.filter;
      }
    });

  const getSavedSearchMock = (searchSource: any = {}) =>
    fromSavedSearchAttributes(
      '4b9b1010-c678-11ea-b6e6-e942978da29c',
      {
        title: 'not test',
        description: '',
        columns: ['_source'],
        sort: [],
        kibanaSavedObjectMeta: {
          searchSourceJSON: '',
        },
        grid: {},
        hideChart: false,
        isTextBasedQuery: false,
      },
      [],
      {
        getField: getFieldMock(searchSource),
      } as unknown as ISearchSource,
      false
    );

  test('should match data view', () => {
    const resp = createSearchItems(kibanaConfig, indexPattern, null);
    expect(resp).toStrictEqual({
      combinedQuery: { bool: { must: [{ match_all: {} }] } },
      query: { query: '', language: 'lucene' },
    });
  });

  test('should match saved search with kuery and condition', () => {
    const savedSearch = getSavedSearchMock({
      highlightAll: true,
      version: true,
      query: { query: 'airline : "AAL" ', language: 'kuery' },
      filter: [],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    });

    const resp = createSearchItems(kibanaConfig, indexPattern, savedSearch);
    expect(resp).toStrictEqual({
      combinedQuery: {
        bool: {
          should: [{ match_phrase: { airline: 'AAL' } }],
          minimum_should_match: 1,
          filter: [],
          must_not: [],
        },
      },
      query: {
        language: 'kuery',
        query: 'airline : "AAL" ',
      },
    });
  });

  test('should match saved search with kuery and not condition', () => {
    const savedSearch = getSavedSearchMock({
      highlightAll: true,
      version: true,
      query: { query: 'NOT airline : "AAL" ', language: 'kuery' },
      filter: [],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    });

    const resp = createSearchItems(kibanaConfig, indexPattern, savedSearch);
    expect(resp).toStrictEqual({
      combinedQuery: {
        bool: {
          filter: [],
          must_not: [
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    match_phrase: {
                      airline: 'AAL',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      query: {
        language: 'kuery',
        query: 'NOT airline : "AAL" ',
      },
    });
  });

  test('should match saved search with kuery and condition and not condition', () => {
    const savedSearch = getSavedSearchMock({
      highlightAll: true,
      version: true,
      query: { query: 'airline : "AAL" and NOT airline : "AWE" ', language: 'kuery' },
      filter: [],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    });

    const resp = createSearchItems(kibanaConfig, indexPattern, savedSearch);
    expect(resp).toStrictEqual({
      combinedQuery: {
        bool: {
          filter: [
            { bool: { should: [{ match_phrase: { airline: 'AAL' } }], minimum_should_match: 1 } },
            {
              bool: {
                must_not: {
                  bool: { should: [{ match_phrase: { airline: 'AWE' } }], minimum_should_match: 1 },
                },
              },
            },
          ],
          must_not: [],
        },
      },
      query: { query: 'airline : "AAL" and NOT airline : "AWE" ', language: 'kuery' },
    });
  });

  test('should match saved search with kuery and filter', () => {
    const savedSearch = getSavedSearchMock({
      highlightAll: true,
      version: true,
      query: {
        language: 'kuery',
        query: '',
      },
      filter: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'airline',
            params: {
              query: 'AAL',
            },
            indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index',
          },
          query: {
            match_phrase: {
              airline: 'AAL',
            },
          },
          $state: {
            store: 'appState',
          },
        },
      ],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    });

    const resp = createSearchItems(kibanaConfig, indexPattern, savedSearch);
    expect(resp).toStrictEqual({
      combinedQuery: {
        bool: {
          must: [{ match_all: {} }],
          filter: [{ match_phrase: { airline: 'AAL' } }],
          must_not: [],
        },
      },
      query: { language: 'kuery', query: '' },
    });
  });
});
