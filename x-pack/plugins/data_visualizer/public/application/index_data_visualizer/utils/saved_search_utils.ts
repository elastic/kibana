/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with duplicate component `CorrelationsProgressControls` in
// `x-pack/plugins/observability_solution/apm/public/components/app/correlations/progress_controls.tsx`
import { cloneDeep } from 'lodash';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { Query, Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { getEsQueryConfig, SearchSource } from '@kbn/data-plugin/common';
import type { FilterManager } from '@kbn/data-plugin/public';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { getDefaultDSLQuery } from '@kbn/ml-query-utils';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { isDefined } from '@kbn/ml-is-defined';
import type { SavedSearchSavedObject } from '../../../../common/types';
import { isSavedSearchSavedObject } from '../../../../common/types';

/**
 * Parse the stringified searchSourceJSON
 * from a saved search or saved search object
 */
export function getQueryFromSavedSearchObject(savedSearch: SavedSearchSavedObject | SavedSearch) {
  if (!isSavedSearchSavedObject(savedSearch)) {
    return savedSearch.searchSource.getSerializedFields();
  }
  const search =
    savedSearch?.attributes?.kibanaSavedObjectMeta ?? // @ts-ignore
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

function getSavedSearchSource(savedSearch?: SavedSearch | null) {
  return isDefined(savedSearch) &&
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
  if (!dataView && !savedSearch) return;

  const userQuery = query;
  const userFilters = filters;

  if (filterManager && userFilters) {
    filterManager.addFilters(userFilters);
  }

  const savedSearchSource = getSavedSearchSource(savedSearch);

  // If saved search has a search source with nested parent
  // e.g. a search coming from Dashboard saved search embeddable
  // which already combines both the saved search's original query/filters and the Dashboard's
  // then no need to process any further
  if (savedSearchSource && savedSearchSource.getParent() !== undefined && userQuery) {
    // Flattened query from search source may contain a clause that narrows the time range
    // which might interfere with global time pickers so we need to remove
    const savedQuery =
      cloneDeep(savedSearchSource.getSearchRequestBody()?.query) ?? getDefaultDSLQuery();
    const timeField = savedSearchSource.getDataViewLazy()?.timeFieldName;

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

  // If no saved search available, use user's query and filters
  if (
    !savedSearch &&
    (userQuery || userFilters || (filterManager && filterManager.getGlobalFilters()?.length > 0))
  ) {
    const combinedQuery = buildEsQuery(
      dataView,
      userQuery ?? [],
      filterManager?.getFilters() ?? [],
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );

    return {
      searchQuery: combinedQuery,
      searchString: userQuery?.query ?? '',
      queryLanguage: (userQuery?.language ?? 'kuery') as SearchQueryLanguage,
    };
  }

  // If saved search available, merge saved search with the latest user query or filters
  // which might differ from extracted saved search data
  if (savedSearchSource) {
    // FIXME: Add support for AggregateQuery type #150091
    const currentQuery = userQuery ?? (savedSearchSource.getField('query') as Query);
    const currentFilters =
      userFilters ?? mapAndFlattenFilters(savedSearchSource.getField('filter') as Filter[]);
    if (filterManager) filterManager.addFilters(currentFilters);

    const combinedQuery = buildEsQuery(
      dataView,
      currentQuery,
      filterManager ? filterManager?.getFilters() : currentFilters,
      uiSettings ? getEsQueryConfig(uiSettings) : undefined
    );

    return {
      searchQuery: combinedQuery,
      searchString: currentQuery?.query ?? '',
      queryLanguage: (currentQuery?.language as SearchQueryLanguage) ?? 'kuery',
      queryOrAggregateQuery: currentQuery,
    };
  }
}
