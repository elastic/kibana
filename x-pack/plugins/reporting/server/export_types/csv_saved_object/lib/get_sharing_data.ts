/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { Filter } from '@kbn/es-query';
import type { IUiSettingsClient, SavedObject } from 'kibana/server';
import moment from 'moment-timezone';
import type { ISearchSource } from 'src/plugins/data/common';
import type { VisualizationSavedObjectAttributes } from 'src/plugins/visualizations/common';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../../../../../../src/plugins/discover/common';
import { getSortForSearchSource } from './get_sort_for_search_source';

export type SavedSearchObjectType = SavedObject<
  VisualizationSavedObjectAttributes & { columns?: string[]; sort: Array<[string, string]> }
>;

function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}
type FilterResponse = undefined | Filter | Filter[] | (() => Filter | Filter[] | undefined);
function normalizeFilter(savedSearchFilterTmp?: FilterResponse) {
  let savedSearchFilter: Filter[] | undefined;
  if (savedSearchFilterTmp && Array.isArray(savedSearchFilterTmp)) {
    // can not include functions: could be recursive
    savedSearchFilter = [...savedSearchFilterTmp.filter((f) => typeof f !== 'function')];
  } else if (savedSearchFilterTmp && typeof savedSearchFilterTmp !== 'function') {
    savedSearchFilter = [savedSearchFilterTmp];
  }
  return savedSearchFilter;
}

/**
 * Partially copied from src/plugins/discover/public/application/apps/main/utils/get_sharing_data.ts
 */

export async function getSharingData(
  services: { uiSettings: IUiSettingsClient },
  currentSearchSource: ISearchSource,
  savedSearch: SavedSearchObjectType,
  jobParamsTimeRange?: { min?: string | number; max?: string | number; timezone?: string },
  jobParamsUnsavedState?: {
    query: estypes.QueryDslQueryContainer | estypes.QueryDslQueryContainer[];
  }
) {
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index');

  if (!index) {
    throw new Error(`Search Source is missing the "index" field`);
  }

  // Inject sort
  searchSource.setField('sort', getSortForSearchSource(savedSearch.attributes.sort, index));

  // Remove the fields that are not suitable for export and paging
  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  const [hideTimeColumn, useFieldsFromSource] = await Promise.all([
    services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING),
    services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE),
  ]);

  // Add/adjust columns from the saved search attributes and UI Settings
  let columns: string[] | undefined;
  let timeFieldName: string | undefined;
  // ignore '_source' column: it may be the only column when the user wishes to export all fields
  const columnsTemp = savedSearch.attributes?.columns?.filter((col) => col !== '_source');

  if (typeof columnsTemp !== 'undefined' && columnsTemp.length > 0 && isStringArray(columnsTemp)) {
    columns = columnsTemp;

    // conditionally add the time field column:
    if (index?.timeFieldName && !hideTimeColumn) {
      timeFieldName = index.timeFieldName;
    }
    if (timeFieldName && !columnsTemp.includes(timeFieldName)) {
      columns = [timeFieldName, ...columns];
    }

    /*
     * For querying performance, the searchSource object must have fields set.
     * Otherwise, the requests will ask for all fields, even if only a few are really needed.
     * Discover does not set fields, since having all fields is needed for the UI.
     */
    if (!useFieldsFromSource && columns.length) {
      searchSource.setField('fields', columns);
    }
  } else {
    searchSource.setField('fields', ['*']);
  }

  // Combine the job's time filter into the SearchSource instance
  let jobParamsTimeRangeFilter: Filter | undefined;
  if ((jobParamsTimeRange?.min || jobParamsTimeRange?.max) && timeFieldName) {
    const { min, max } = jobParamsTimeRange;
    const timezone = jobParamsTimeRange.timezone ?? 'UTC';
    const minTime = min ? moment.tz(min, timezone) : undefined;
    const maxTime = max ? moment.tz(max, timezone) : undefined;
    jobParamsTimeRangeFilter = {
      meta: { index: index.id },
      query: {
        range: {
          [timeFieldName]: {
            format: 'strict_date_optional_time',
            gte: minTime?.toISOString(),
            lte: maxTime?.toISOString(),
          },
        },
      },
    };
  }

  // Combine the time range filter from the job request body with any filters that have been saved into the saved search object
  // NOTE: if the filters that were saved into the search are NOT an array, it may be a function. Function
  // filters are not supported in this API.
  let combinedFilters: Filter[] = [];
  const savedSearchFilter = normalizeFilter(searchSource.getField('filter'));
  const jobParamsStateFilter = normalizeFilter(jobParamsUnsavedState?.query as FilterResponse);

  if (jobParamsTimeRangeFilter) {
    combinedFilters.push(jobParamsTimeRangeFilter);
  }
  if (savedSearchFilter && savedSearchFilter.length > 0) {
    combinedFilters = combinedFilters.concat(savedSearchFilter);
  }
  if (jobParamsStateFilter && jobParamsStateFilter?.length > 0) {
    combinedFilters = combinedFilters.concat(jobParamsStateFilter);
  }

  searchSource.removeField('filter');
  if (combinedFilters.length > 0) {
    searchSource.setField('filter', combinedFilters);
  }

  return {
    columns,
    searchSource: searchSource.getSerializedFields(true),
  };
}
