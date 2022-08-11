/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearchSavedObject } from '../../../../../common/types/kibana';
import { createSearchItems } from './new_job_utils';

describe('createSearchItems', () => {
  const kibanaConfig = {} as IUiSettingsClient;
  const indexPattern = {
    fields: [],
  } as unknown as DataView;

  let savedSearch = {} as unknown as SavedSearchSavedObject;
  beforeEach(() => {
    savedSearch = {
      client: {
        http: {
          basePath: {
            basePath: '/abc',
            serverBasePath: '/abc',
          },
          anonymousPaths: {},
        },
        batchQueue: [],
      },
      attributes: {
        title: 'not test',
        description: '',
        hits: 0,
        columns: ['_source'],
        sort: [],
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '',
        },
      },
      _version: 'WzI0OSw0XQ==',
      id: '4b9b1010-c678-11ea-b6e6-e942978da29c',
      type: 'search',
      migrationVersion: {
        search: '7.4.0',
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: '7e252840-bd27-11ea-8a6c-75d1a0bd08ab',
        },
      ],
    } as unknown as SavedSearchSavedObject;
  });

  test('should match data view', () => {
    const resp = createSearchItems(kibanaConfig, indexPattern, null);
    expect(resp).toStrictEqual({
      combinedQuery: { bool: { must: [{ match_all: {} }] } },
      query: { query: '', language: 'lucene' },
    });
  });

  test('should match saved search with kuery and condition', () => {
    const searchSource = {
      highlightAll: true,
      version: true,
      query: { query: 'airline : "AAL" ', language: 'kuery' },
      filter: [],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    };
    savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);

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
    const searchSource = {
      highlightAll: true,
      version: true,
      query: { query: 'NOT airline : "AAL" ', language: 'kuery' },
      filter: [],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    };
    savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);

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
    const searchSource = {
      highlightAll: true,
      version: true,
      query: { query: 'airline : "AAL" and NOT airline : "AWE" ', language: 'kuery' },
      filter: [],
      indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
    };
    savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);

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
    const searchSource = {
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
    };
    savedSearch.attributes.kibanaSavedObjectMeta.searchSourceJSON = JSON.stringify(searchSource);

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
