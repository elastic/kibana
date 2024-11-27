/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with duplicate saved search utils file in
// `x-pack/plugins/data_visualizer/public/application/index_data_visualizer/utils/saved_search_utils.ts`

import { cloneDeep } from 'lodash';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig, SearchSource } from '@kbn/data-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import type { Query, Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SimpleSavedObject } from '@kbn/core/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { getDefaultDSLQuery, type SearchQueryLanguage } from '@kbn/ml-query-utils';

export type SavedSearchSavedObject = SimpleSavedObject<any>;

export function isSavedSearchSavedObject(arg: unknown): arg is SavedSearchSavedObject {
  return isPopulatedObject(arg, ['id', 'type', 'attributes']);
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

function getSavedSearchSource(savedSearch: SavedSearch) {
  return savedSearch &&
    'searchSource' in savedSearch &&
    savedSearch?.searchSource instanceof SearchSource
    ? savedSearch.searchSource
    : undefined;
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
  savedSearch: SavedSearch | null | undefined;
  query?: Query;
  filters?: Filter[];
  filterManager?: FilterManager;
}) {
  if (!dataView || !savedSearch) return;

  const userQuery = query;
  const userFilters = filters;

  const savedSearchSource = getSavedSearchSource(savedSearch);

  // If saved search has a search source with nested parent
  // e.g. a search coming from Dashboard saved search embeddable
  // which already combines both the saved search's original query/filters and the Dashboard's
  // then no need to process any further
  if (savedSearchSource && savedSearchSource.getParent() !== undefined && userQuery) {
    // Flattened query from search source may contain a clause that narrows the time range
    // which might interfere with global time pickers so we need to remove
    const savedQuery =
      cloneDeep(savedSearch.searchSource.getSearchRequestBody()?.query) ?? getDefaultDSLQuery();
    const timeField = savedSearch.searchSource.getField('index')?.timeFieldName;

    if (Array.isArray(savedQuery.bool.filter) && timeField !== undefined) {
      savedQuery.bool.filter = savedQuery.bool.filter.filter(
        (c: QueryDslQueryContainer) =>
          !(Object.hasOwn(c, 'range') && Object.hasOwn(c.range ?? {}, timeField))
      );
    }
    return {
      searchQuery: savedQuery,
      searchString: userQuery.query,
      queryLanguage: userQuery.language as SearchQueryLanguage,
    };
  }

  // If no saved search available, use user's query and filters
  if (!savedSearch && userQuery) {
    if (filterManager && userFilters) filterManager.addFilters(userFilters);

    const combinedQuery = buildEsQuery(
      dataView,
      userQuery,
      Array.isArray(userFilters) ? userFilters : [],
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );

    return {
      searchQuery: combinedQuery,
      searchString: userQuery.query,
      queryLanguage: userQuery.language as SearchQueryLanguage,
    };
  }

  // If saved search available, merge saved search with the latest user query or filters
  // which might differ from extracted saved search data
  if (savedSearchSource) {
    const globalFilters = filterManager?.getGlobalFilters();
    // FIXME: Add support for AggregateQuery type #150091
    const currentQuery = userQuery ?? (savedSearchSource.getField('query') as Query);
    const currentFilters =
      userFilters ?? mapAndFlattenFilters(savedSearchSource.getField('filter') as Filter[]);
    if (filterManager) filterManager.setFilters(currentFilters);
    if (globalFilters) filterManager?.addFilters(globalFilters);

    const combinedQuery = buildEsQuery(
      dataView,
      currentQuery,
      filterManager ? filterManager?.getFilters() : currentFilters,
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );

    return {
      searchQuery: combinedQuery,
      searchString: currentQuery.query,
      queryLanguage: currentQuery.language as SearchQueryLanguage,
    };
  }
}
