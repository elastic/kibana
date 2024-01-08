/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { first } from 'lodash';

export async function getDataViewByIndexPattern(
  dataViews: DataViewsContract,
  indexPatternFromQuery: string | undefined,
  currentDataView: DataView | undefined
) {
  if (indexPatternFromQuery) {
    const matched = await dataViews.find(indexPatternFromQuery);
    if (matched) return first(matched);
  }
  if (
    indexPatternFromQuery &&
    (currentDataView?.isPersisted() || indexPatternFromQuery !== currentDataView?.getIndexPattern())
  ) {
    const dataViewObj = await dataViews.create({
      title: indexPatternFromQuery,
    });

    if (dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }
    return dataViewObj;
  }
  return currentDataView;
}
