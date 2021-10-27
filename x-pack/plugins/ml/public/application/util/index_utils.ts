/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Query } from '../../../../../../src/plugins/data/public';
import type { DataView, DataViewsContract } from '../../../../../../src/plugins/data_views/public';
import type { SavedSearchSavedObject } from '../../../common/types/kibana';
import { getToastNotifications, getSavedObjectsClient } from './dependency_cache';

let savedSearchesCache: SavedSearchSavedObject[] = [];
let dataViewsContract: DataViewsContract | null = null;

export async function cacheDataViewsContract(dvc: DataViewsContract) {
  dataViewsContract = dvc;
}

export function loadSavedSearches() {
  const savedObjectsClient = getSavedObjectsClient();
  return savedObjectsClient
    .find({
      type: 'search',
      perPage: 10000,
    })
    .then((response) => {
      savedSearchesCache = response.savedObjects;
      return savedSearchesCache;
    });
}

export async function loadSavedSearchById(id: string) {
  const savedObjectsClient = getSavedObjectsClient();
  const ss = await savedObjectsClient.get('search', id);
  return ss.error === undefined ? ss : null;
}

export async function getIndexPatternNames() {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }
  return (await dataViewsContract.getIdsWithTitle()).map(({ title }) => title);
}

export async function getIndexPatternIdFromName(name: string): Promise<string | null> {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }
  const [dv] = await dataViewsContract?.find(name);
  if (!dv) {
    return null;
  }
  return dv.id ?? dv.title;
}

export function getIndexPatternById(id: string): Promise<DataView> {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }

  if (id) {
    return dataViewsContract.get(id);
  } else {
    return dataViewsContract.create({});
  }
}

export interface IndexPatternAndSavedSearch {
  savedSearch: SavedSearchSavedObject | null;
  indexPattern: DataView | null;
}

export async function getIndexPatternAndSavedSearch(savedSearchId: string) {
  const resp: IndexPatternAndSavedSearch = {
    savedSearch: null,
    indexPattern: null,
  };

  if (savedSearchId === undefined) {
    return resp;
  }

  const ss = await loadSavedSearchById(savedSearchId);
  if (ss === null) {
    return resp;
  }
  const indexPatternId = ss.references.find((r) => r.type === 'index-pattern')?.id;
  resp.indexPattern = await getIndexPatternById(indexPatternId!);
  resp.savedSearch = ss;
  return resp;
}

export function getQueryFromSavedSearchObject(savedSearch: SavedSearchSavedObject) {
  const search = savedSearch.attributes.kibanaSavedObjectMeta as { searchSourceJSON: string };
  return JSON.parse(search.searchSourceJSON) as {
    query: Query;
    filter: any[];
  };
}

export function getSavedSearchById(id: string): SavedSearchSavedObject | undefined {
  return savedSearchesCache.find((s) => s.id === id);
}

/**
 * Returns true if the index passed in is time based
 * an optional flag will trigger the display a notification at the top of the page
 * warning that the index is not time based
 */
export function timeBasedIndexCheck(indexPattern: DataView, showNotification = false) {
  if (!indexPattern.isTimeBased()) {
    if (showNotification) {
      const toastNotifications = getToastNotifications();
      toastNotifications.addWarning({
        title: i18n.translate('xpack.ml.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view {dataViewName} is not based on a time series',
          values: { dataViewName: indexPattern.title },
        }),
        text: i18n.translate('xpack.ml.dataViewNotBasedOnTimeSeriesNotificationDescription', {
          defaultMessage: 'Anomaly detection only runs over time-based indices',
        }),
      });
    }
    return false;
  } else {
    return true;
  }
}

/**
 * Returns true if the data view name contains a :
 * which means it is cross-cluster
 */
export function isCcsIndexPattern(dataViewName: string) {
  return dataViewName.includes(':');
}
