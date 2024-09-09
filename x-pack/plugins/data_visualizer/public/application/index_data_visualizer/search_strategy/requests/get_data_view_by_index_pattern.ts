/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  getESQLAdHocDataview,
  getIndexPatternFromESQLQuery,
  getTimeFieldFromESQLQuery,
} from '@kbn/esql-utils';

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
  query: string,
  currentDataView: DataView | undefined
) {
  const indexPatternFromQuery = getIndexPatternFromESQLQuery(query);
  const newTimeField = getTimeFieldFromESQLQuery(query);

  if (
    currentDataView?.isPersisted() ||
    indexPatternFromQuery !== currentDataView?.getIndexPattern() ||
    // here the pattern hasn't changed but the time field has
    (newTimeField !== currentDataView?.timeFieldName &&
      indexPatternFromQuery === currentDataView?.getIndexPattern())
  ) {
    return await getESQLAdHocDataview(query, dataViews);
  }
  return currentDataView;
}
