/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, SavedObject } from 'kibana/server';
import type { Filter, ISearchSource } from 'src/plugins/data/common';
import type { VisualizationSavedObjectAttributes } from 'src/plugins/visualizations/common';
import {
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
} from '../../../../../../../src/plugins/discover/common';
import { getSortForSearchSource } from './get_sort_for_search_source';
import { isStringArray } from './is_string_array';

type SavedSearchObjectType = SavedObject<
  VisualizationSavedObjectAttributes & { columns?: string[]; sort: Array<[string, string]> }
>;

/**
 * Partially copied from src/plugins/discover/public/application/apps/main/utils/get_sharing_data.ts
 */

export async function getSharingData(
  currentSearchSource: ISearchSource,
  savedSearch: SavedSearchObjectType,
  timeRange: { min: string | number | null; max: string | number | null } | undefined,
  services: { uiSettings: IUiSettingsClient }
) {
  const searchSource = currentSearchSource.createCopy();
  const index = searchSource.getField('index');
  if (!index) {
    throw new Error(`Search Source is missing the "index" field`);
  }

  const existingFilter = searchSource.getField('filter');

  searchSource.removeField('filter');
  searchSource.removeField('highlight');
  searchSource.removeField('highlightAll');
  searchSource.removeField('aggs');
  searchSource.removeField('size');

  // Add columns from the saved search attributes
  let timeFieldName: string | undefined;
  let columns: string[] | undefined;
  const columnsTemp = savedSearch.attributes.columns;
  if (typeof columnsTemp !== 'undefined' && isStringArray(columnsTemp)) {
    columns = columnsTemp;

    // conditionally add the time field column:
    const hideTimeColumn = await services.uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING);

    if (!hideTimeColumn && index && index.timeFieldName) {
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
    const useFieldsApi = !(await services.uiSettings.get(SEARCH_FIELDS_FROM_SOURCE));
    if (useFieldsApi && columns.length) {
      searchSource.setField('fields', columns);
    }
  }

  // Combine the job's time filter into the SearchSource instance
  if (timeFieldName) {
    const timeFilter = {
      meta: { field: timeFieldName, index: index.id },
      query: {
        range: {
          [timeFieldName]: {
            format: 'strict_date_optional_time',
            gte: timeRange?.min,
            lte: timeRange?.max,
          },
        },
      },
    };
    if (existingFilter && timeRange) {
      searchSource.setField(
        'filter',
        Array.isArray(existingFilter)
          ? [timeFilter, ...existingFilter]
          : ([timeFilter, existingFilter] as Filter[])
      );
    } else {
      const filter = timeFilter || existingFilter;
      searchSource.setField('filter', filter);
    }
  }

  // Inject sort
  searchSource.setField('sort', getSortForSearchSource(savedSearch.attributes.sort, index));

  return {
    columns,
    searchSource: searchSource.getSerializedFields(true),
  };
}
