/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedSearch, SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { Query, Filter } from '@kbn/es-query';
import type { DataView, DataViewField, DataViewsContract } from '@kbn/data-views-plugin/common';

export interface DataViewAndSavedSearch {
  savedSearch: SavedSearch | null;
  dataView: DataView | null;
}

export const getDataViewAndSavedSearchCallback =
  (deps: {
    savedSearchService: SavedSearchPublicPluginStart;
    dataViewsService: DataViewsContract;
  }) =>
  async (savedSearchId: string) => {
    const resp: DataViewAndSavedSearch = {
      savedSearch: null,
      dataView: null,
    };

    if (savedSearchId === undefined) {
      return resp;
    }

    const ss = await deps.savedSearchService.get(savedSearchId);
    if (ss === null) {
      return resp;
    }
    const dataViewId = ss.references?.find((r) => r.type === 'index-pattern')?.id;
    resp.dataView = await deps.dataViewsService.get(dataViewId!);
    resp.savedSearch = ss;
    return resp;
  };

export function getQueryFromSavedSearchObject(savedSearch: SavedSearch) {
  return {
    query: savedSearch.searchSource.getField('query')! as Query,
    filter: savedSearch.searchSource.getField('filter') as Filter[],
  };
}

/**
 * Returns true if the index pattern contains a :
 * which means it is cross-cluster
 */
export function isCcsIndexPattern(indexPattern: string) {
  return indexPattern.includes(':');
}

export function findMessageField(
  dataView: DataView
): { dataView: DataView; field: DataViewField } | null {
  const foundFields: Record<string, DataViewField | null> = { message: null, errorMessage: null };

  for (const f of dataView.fields) {
    if (f.name === 'message' && f.toSpec().esTypes?.includes('text')) {
      foundFields.message = f;
    } else if (f.name === 'error.message' && f.toSpec().esTypes?.includes('text')) {
      foundFields.errorMessage = f;
    }
  }

  if (foundFields.message !== null) {
    return { dataView, field: foundFields.message };
  } else if (foundFields.errorMessage !== null) {
    return { dataView, field: foundFields.errorMessage };
  }

  return null;
}
