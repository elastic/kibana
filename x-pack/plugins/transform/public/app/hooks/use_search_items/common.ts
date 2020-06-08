/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SimpleSavedObject, IUiSettingsClient } from 'src/core/public';
import {
  IndexPattern,
  esQuery,
  IndexPatternsContract,
  IndexPatternAttributes,
} from '../../../../../../../src/plugins/data/public';

import { matchAllQuery } from '../../common';

export type SavedSearchQuery = object;

type IndexPatternId = string;
type SavedSearchId = string;

let indexPatternCache: Array<SimpleSavedObject<Record<string, any>>> = [];
let fullIndexPatterns;
let currentIndexPattern = null;
let currentSavedSearch = null;

export let refreshIndexPatterns: () => Promise<unknown>;

export function loadIndexPatterns(
  savedObjectsClient: SavedObjectsClientContract,
  indexPatterns: IndexPatternsContract
) {
  fullIndexPatterns = indexPatterns;
  return savedObjectsClient
    .find<IndexPatternAttributes>({
      type: 'index-pattern',
      fields: ['id', 'title', 'type', 'fields'],
      perPage: 10000,
    })
    .then((response) => {
      indexPatternCache = response.savedObjects;

      if (refreshIndexPatterns === null) {
        refreshIndexPatterns = () => {
          return new Promise((resolve, reject) => {
            loadIndexPatterns(savedObjectsClient, indexPatterns)
              .then((resp) => {
                resolve(resp);
              })
              .catch((error) => {
                reject(error);
              });
          });
        };
      }

      return indexPatternCache;
    });
}

export function getIndexPatternIdByTitle(indexPatternTitle: string): string | undefined {
  return indexPatternCache.find((d) => d?.attributes?.title === indexPatternTitle)?.id;
}

type CombinedQuery = Record<'bool', any> | object;

export function loadCurrentIndexPattern(
  indexPatterns: IndexPatternsContract,
  indexPatternId: IndexPatternId
) {
  fullIndexPatterns = indexPatterns;
  currentIndexPattern = fullIndexPatterns.get(indexPatternId);
  return currentIndexPattern;
}

export function loadCurrentSavedSearch(savedSearches: any, savedSearchId: SavedSearchId) {
  currentSavedSearch = savedSearches.get(savedSearchId);
  return currentSavedSearch;
}

function isIndexPattern(arg: any): arg is IndexPattern {
  return arg !== undefined;
}

export interface SearchItems {
  indexPattern: IndexPattern;
  savedSearch: any;
  query: any;
  combinedQuery: CombinedQuery;
}

// Helper for creating the items used for searching and job creation.
export function createSearchItems(
  indexPattern: IndexPattern | undefined,
  savedSearch: any,
  config: IUiSettingsClient
): SearchItems {
  // query is only used by the data visualizer as it needs
  // a lucene query_string.
  // Using a blank query will cause match_all:{} to be used
  // when passed through luceneStringToDsl
  let query = {
    query: '',
    language: 'lucene',
  };

  let combinedQuery: CombinedQuery = {
    bool: {
      must: [matchAllQuery],
    },
  };

  if (!isIndexPattern(indexPattern) && savedSearch !== null && savedSearch.id !== undefined) {
    const searchSource = savedSearch.searchSource;
    indexPattern = searchSource.getField('index') as IndexPattern;

    query = searchSource.getField('query');
    const fs = searchSource.getField('filter');

    const filters = fs.length ? fs : [];

    const esQueryConfigs = esQuery.getEsQueryConfig(config);
    combinedQuery = esQuery.buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
  }

  if (!isIndexPattern(indexPattern)) {
    throw new Error('Index Pattern is not defined.');
  }

  return {
    indexPattern,
    savedSearch,
    query,
    combinedQuery,
  };
}
