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
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isSavedSearchSavedObject, SavedSearchSavedObject } from '../../../../common/types';
import { IndexPattern, SearchSource } from '../../../../../../../src/plugins/data/common';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../types/combined_query';
import { SavedSearch } from '../../../../../../../src/plugins/discover/public';
import { getEsQueryConfig } from '../../../../../../../src/plugins/data/common';
import { FilterManager } from '../../../../../../../src/plugins/data/public';

const DEFAULT_QUERY: estypes.QueryDslQueryContainer = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};

export function getDefaultQuery(): estypes.QueryDslQueryContainer {
  return cloneDeep(DEFAULT_QUERY);
}

/**
 * Parse the stringified searchSourceJSON
 * from a saved search or saved search object
 */
export function getQueryFromSavedSearchObject(savedSearch: SavedSearchSavedObject | SavedSearch) {
  const search = isSavedSearchSavedObject(savedSearch)
    ? savedSearch?.attributes?.kibanaSavedObjectMeta
    : // @ts-expect-error kibanaSavedObjectMeta does exist
      savedSearch?.kibanaSavedObjectMeta;

  const parsed =
    typeof search?.searchSourceJSON === 'string'
      ? (JSON.parse(search.searchSourceJSON) as {
          query: Query;
          filter: Filter[];
        })
      : undefined;

  // Remove indexRefName because saved search might no longer be relevant
  // if user modifies the query or filter
  // after opening a saved search
  if (parsed && Array.isArray(parsed.filter)) {
    parsed.filter.forEach((f) => {
      // @ts-expect-error indexRefName does appear in meta for newly created saved search
      f.meta.indexRefName = undefined;
    });
  }
  return parsed;
}

/**
 * Create an Elasticsearch query that combines both lucene/kql query string and filters
 * Should also form a valid query if only the query or filters is provided
 */
export function createMergedEsQuery(
  query?: Query,
  filters?: Filter[],
  indexPattern?: IndexPattern,
  uiSettings?: IUiSettingsClient
): estypes.QueryDslQueryContainer {
  let combinedQuery = getDefaultQuery();
  let boolFilters: estypes.QueryDslQueryContainer[] = [];
  let mustNotFilters: estypes.QueryDslQueryContainer[] = [];

  if (query && query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
    const ast = fromKueryExpression(query.query);
    if (query.query !== '') {
      combinedQuery = toElasticsearchQuery(ast, indexPattern);
    }
    if (combinedQuery.bool !== undefined) {
      const filterQuery = buildQueryFromFilters(filters, indexPattern);

      if (Array.isArray(combinedQuery.bool.filter) === false) {
        boolFilters = (
          combinedQuery.bool.filter === undefined ? [] : [combinedQuery.bool.filter]
        ) as estypes.QueryDslQueryContainer[];
      }

      if (Array.isArray(combinedQuery.bool.must_not) === false) {
        mustNotFilters = (
          combinedQuery.bool.must_not === undefined ? [] : [combinedQuery.bool.must_not]
        ) as estypes.QueryDslQueryContainer[];
      }

      combinedQuery.bool.filter = [...boolFilters, ...filterQuery.filter];
      combinedQuery.bool.must_not = [...mustNotFilters, ...filterQuery.must_not];
    }
  } else {
    combinedQuery = buildEsQuery(
      indexPattern,
      query ? [query] : [],
      filters ? filters : [],
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );
  }
  return combinedQuery;
}

/**
 * Extract query data from the saved search object
 * with overrides from the provided query data and/or filters
 */
export function getEsQueryFromSavedSearch({
  indexPattern,
  uiSettings,
  savedSearch,
  query,
  filters,
  filterManager,
}: {
  indexPattern: IndexPattern;
  uiSettings: IUiSettingsClient;
  savedSearch: SavedSearchSavedObject | SavedSearch | null | undefined;
  query?: Query;
  filters?: Filter[];
  filterManager?: FilterManager;
}) {
  if (!indexPattern || !savedSearch) return;

  const userQuery = query;
  const userFilters = filters;

  // If saved search has a search source with nested parent
  // e.g. a search coming from Dashboard saved search embeddable
  // which already combines both the saved search's original query/filters and the Dashboard's
  // then no need to process any further
  if (
    savedSearch &&
    'searchSource' in savedSearch &&
    savedSearch?.searchSource instanceof SearchSource &&
    savedSearch.searchSource.getParent() !== undefined &&
    userQuery
  ) {
    return {
      searchQuery: savedSearch.searchSource.getSearchRequestBody()?.query ?? getDefaultQuery(),
      searchString: userQuery.query,
      queryLanguage: userQuery.language as SearchQueryLanguage,
    };
  }

  // If saved search is an json object with the original query and filter
  // retrieve the parsed query and filter
  const savedSearchData = getQueryFromSavedSearchObject(savedSearch);

  // If no saved search available, use user's query and filters
  if (!savedSearchData && userQuery) {
    if (filterManager && userFilters) filterManager.setFilters(userFilters);

    const combinedQuery = createMergedEsQuery(
      userQuery,
      Array.isArray(userFilters) ? userFilters : [],
      indexPattern,
      uiSettings
    );

    return {
      searchQuery: combinedQuery,
      searchString: userQuery.query,
      queryLanguage: userQuery.language as SearchQueryLanguage,
    };
  }

  // If saved search available, merge saved search with latest user query or filters
  // which might differ from extracted saved search data
  if (savedSearchData) {
    const currentQuery = userQuery ?? savedSearchData?.query;
    const currentFilters = userFilters ?? savedSearchData?.filter;

    if (filterManager) filterManager.setFilters(currentFilters);

    const combinedQuery = createMergedEsQuery(
      currentQuery,
      Array.isArray(currentFilters) ? currentFilters : [],
      indexPattern,
      uiSettings
    );

    return {
      searchQuery: combinedQuery,
      searchString: currentQuery.query,
      queryLanguage: currentQuery.language as SearchQueryLanguage,
    };
  }
}
