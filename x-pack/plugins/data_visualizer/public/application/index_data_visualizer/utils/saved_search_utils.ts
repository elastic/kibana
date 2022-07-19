/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { IUiSettingsClient } from '@kbn/core/public';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  buildQueryFromFilters,
  buildEsQuery,
  Query,
  Filter,
} from '@kbn/es-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SearchSource } from '@kbn/data-plugin/common';
import { DataView } from '@kbn/data-views-plugin/public';
import { SavedSearch } from '@kbn/discover-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { FilterManager } from '@kbn/data-plugin/public';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../types/combined_query';
import { isSavedSearchSavedObject, SavedSearchSavedObject } from '../../../../common/types';

const DEFAULT_QUERY = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};

export function getDefaultQuery() {
  return cloneDeep(DEFAULT_QUERY);
}

/**
 * Parse the stringified searchSourceJSON
 * from a saved search or saved search object
 */
export function getQueryFromSavedSearchObject(savedSearch: SavedSearchSavedObject | SavedSearch) {
  const search = isSavedSearchSavedObject(savedSearch)
    ? savedSearch?.attributes?.kibanaSavedObjectMeta
    : // @ts-ignore
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
  dataView?: DataView,
  uiSettings?: IUiSettingsClient
) {
  let combinedQuery: QueryDslQueryContainer = getDefaultQuery();

  if (query && query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
    const ast = fromKueryExpression(query.query);
    if (query.query !== '') {
      combinedQuery = toElasticsearchQuery(ast, dataView);
    }
    if (combinedQuery.bool !== undefined) {
      const filterQuery = buildQueryFromFilters(filters, dataView);

      if (!Array.isArray(combinedQuery.bool.filter)) {
        combinedQuery.bool.filter =
          combinedQuery.bool.filter === undefined ? [] : [combinedQuery.bool.filter];
      }

      if (!Array.isArray(combinedQuery.bool.must_not)) {
        combinedQuery.bool.must_not =
          combinedQuery.bool.must_not === undefined ? [] : [combinedQuery.bool.must_not];
      }

      combinedQuery.bool.filter = [...combinedQuery.bool.filter, ...filterQuery.filter];
      combinedQuery.bool.must_not = [...combinedQuery.bool.must_not, ...filterQuery.must_not];
    }
  } else {
    combinedQuery = buildEsQuery(
      dataView,
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
  dataView,
  uiSettings,
  savedSearch,
  query,
  filters,
  filterManager,
}: {
  dataView: DataView;
  uiSettings: IUiSettingsClient;
  savedSearch: SavedSearchSavedObject | SavedSearch | null | undefined;
  query?: Query;
  filters?: Filter[];
  filterManager?: FilterManager;
}) {
  if (!dataView || !savedSearch) return;

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
    // Flattened query from search source may contain a clause that narrows the time range
    // which might interfere with global time pickers so we need to remove
    const savedQuery =
      cloneDeep(savedSearch.searchSource.getSearchRequestBody()?.query) ?? getDefaultQuery();
    const timeField = savedSearch.searchSource.getField('index')?.timeFieldName;

    if (Array.isArray(savedQuery.bool.filter) && timeField !== undefined) {
      savedQuery.bool.filter = savedQuery.bool.filter.filter(
        (c: QueryDslQueryContainer) =>
          !(c.hasOwnProperty('range') && c.range?.hasOwnProperty(timeField))
      );
    }
    return {
      searchQuery: savedQuery,
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
      dataView,
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
      dataView,
      uiSettings
    );

    return {
      searchQuery: combinedQuery,
      searchString: currentQuery.query,
      queryLanguage: currentQuery.language as SearchQueryLanguage,
    };
  }
}
