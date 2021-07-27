/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { IUiSettingsClient } from 'kibana/public';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  buildQueryFromFilters,
  buildEsQuery,
  Query,
  Filter,
} from '@kbn/es-query';
import { isSavedSearchSavedObject, SavedSearchSavedObject } from '../../../../common/types';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../types/combined_query';
import { SavedSearch } from '../../../../../../../src/plugins/discover/public';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';

export function getQueryFromSavedSearch(savedSearch: SavedSearchSavedObject | SavedSearch) {
  // @todo: add type assertion for savedsearch or export function getQueryFromSavedSearch(savedSearch: SavedSearchSavedObject) {
  const search = isSavedSearchSavedObject(savedSearch)
    ? savedSearch?.attributes?.kibanaSavedObjectMeta
    : // @ts-expect-error kibanaSavedObjectMeta does exist
      savedSearch?.kibanaSavedObjectMeta;

  return typeof search?.searchSourceJSON === 'string'
    ? (JSON.parse(search.searchSourceJSON) as {
        query: Query;
        filter: any[];
      })
    : undefined;
}

export function createCombinedQuery(
  query: Query,
  filters: Filter[],
  indexPattern?: IndexPattern,
  uiSettings?: IUiSettingsClient
) {
  let combinedQuery: any = getDefaultDatafeedQuery();

  if (query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
    const ast = fromKueryExpression(query.query);
    if (query.query !== '') {
      combinedQuery = toElasticsearchQuery(ast, indexPattern);
    }
    const filterQuery = buildQueryFromFilters(filters, indexPattern);

    if (Array.isArray(combinedQuery.bool.filter) === false) {
      combinedQuery.bool.filter =
        combinedQuery.bool.filter === undefined ? [] : [combinedQuery.bool.filter];
    }

    if (Array.isArray(combinedQuery.bool.must_not) === false) {
      combinedQuery.bool.must_not =
        combinedQuery.bool.must_not === undefined ? [] : [combinedQuery.bool.must_not];
    }

    combinedQuery.bool.filter = [...combinedQuery.bool.filter, ...filterQuery.filter];
    combinedQuery.bool.must_not = [...combinedQuery.bool.must_not, ...filterQuery.must_not];
  } else {
    combinedQuery = buildEsQuery(
      indexPattern,
      [query],
      filters,
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );
  }
  return combinedQuery;
}

/**
 * Extract query data from the saved search object.
 */
export function extractSearchData(
  savedSearch: SavedSearchSavedObject | null,
  indexPattern: IndexPattern,
  uiSettings: IUiSettingsClient
) {
  if (!savedSearch) {
    return undefined;
  }

  const data = getQueryFromSavedSearch(savedSearch);

  if (!data) return;
  const combinedQuery = createCombinedQuery(
    data.query,
    Array.isArray(data.filter) ? data.filter : [],
    indexPattern,
    uiSettings
  );

  return {
    searchQuery: combinedQuery,
    searchString: data.query.query,
    queryLanguage: data.query.language as SearchQueryLanguage,
  };
}

const DEFAULT_QUERY = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};

export function getDefaultDatafeedQuery() {
  return cloneDeep(DEFAULT_QUERY);
}
