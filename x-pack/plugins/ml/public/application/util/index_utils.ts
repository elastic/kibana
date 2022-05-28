/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/data-plugin/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
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

export async function getDataViewNames() {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }
  return (await dataViewsContract.getIdsWithTitle()).map(({ title }) => title);
}

export async function getDataViewIdFromName(name: string): Promise<string | null> {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }
  const dataViews = await dataViewsContract.find(name);
  const dataView = dataViews.find(({ title }) => title === name);
  if (!dataView) {
    return null;
  }
  return dataView.id ?? dataView.title;
}

export function getDataViewById(id: string): Promise<DataView> {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }

  if (id) {
    return dataViewsContract.get(id);
  } else {
    return dataViewsContract.create({});
  }
}

export interface DataViewAndSavedSearch {
  savedSearch: SavedSearchSavedObject | null;
  dataView: DataView | null;
}

export async function getDataViewAndSavedSearch(savedSearchId: string) {
  const resp: DataViewAndSavedSearch = {
    savedSearch: null,
    dataView: null,
  };

  if (savedSearchId === undefined) {
    return resp;
  }

  const ss = await loadSavedSearchById(savedSearchId);
  if (ss === null) {
    return resp;
  }
  const dataViewId = ss.references.find((r) => r.type === 'index-pattern')?.id;
  resp.dataView = await getDataViewById(dataViewId!);
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
export function timeBasedIndexCheck(dataView: DataView, showNotification = false) {
  if (!dataView.isTimeBased()) {
    if (showNotification) {
      const toastNotifications = getToastNotifications();
      toastNotifications.addWarning({
        title: i18n.translate('xpack.ml.dataViewNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The data view {dataViewName} is not based on a time series',
          values: { dataViewName: dataView.title },
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
