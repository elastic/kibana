/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { getESQLAdHocDataview } from '@kbn/esql-utils';

/**
 * Get a saved data view that matches the index pattern (as close as possible)
 * or create a new adhoc data view if no matches found
 * @param dataViews
 * @param indexPatternFromQuery
 * @param currentDataView
 * @returns
 */
export async function getOrCreateDataViewByIndexPattern(
  dataViews: DataViewsContract,
  indexPatternFromQuery: string | undefined,
  currentDataView: DataView | undefined
) {
  if (indexPatternFromQuery) {
    const matched = await dataViews.find(indexPatternFromQuery);

    // Only returns persisted data view if it matches index pattern exactly
    // Because * in pattern can result in misleading matches (i.e. "kibana*" will return data view with pattern "kibana_1")
    // which is not neccessarily the one we want to use
    if (matched.length > 0 && matched[0].getIndexPattern() === indexPatternFromQuery)
      return matched[0];
  }

  if (
    indexPatternFromQuery &&
    (currentDataView?.isPersisted() || indexPatternFromQuery !== currentDataView?.getIndexPattern())
  ) {
    return await getESQLAdHocDataview(indexPatternFromQuery, dataViews);
  }
  return currentDataView;
}
