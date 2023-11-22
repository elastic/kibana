/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch, SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
import type { Query, Filter } from '@kbn/es-query';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type { Job } from '../../../common/types/anomaly_detection_jobs';
import { getToastNotifications, getDataViews } from './dependency_cache';

export async function getDataViewNames() {
  const dataViewsService = getDataViews();
  if (dataViewsService === null) {
    throw new Error('Data views are not initialized!');
  }
  return (await dataViewsService.getIdsWithTitle()).map(({ title }) => title);
}

/**
 * Retrieves the data view ID from the given name.
 * If a job is passed in, a temporary data view will be created if the requested data view doesn't exist.
 * @param name - The name or index pattern of the data view.
 * @param job - Optional job object.
 * @returns The data view ID or null if it doesn't exist.
 */
export async function getDataViewIdFromName(name: string, job?: Job): Promise<string | null> {
  const dataViewsService = getDataViews();
  if (dataViewsService === null) {
    throw new Error('Data views are not initialized!');
  }
  const dataViews = await dataViewsService.find(name);
  const dataView = dataViews.find((dv) => dv.getIndexPattern() === name);
  if (!dataView) {
    if (job !== undefined) {
      const tempDataView = await dataViewsService.create({
        id: undefined,
        name,
        title: name,
        timeFieldName: job.data_description.time_field!,
      });
      return tempDataView.id ?? null;
    }
    return null;
  }
  return dataView.id ?? dataView.getIndexPattern();
}

export function getDataViewById(id: string): Promise<DataView> {
  const dataViewsService = getDataViews();
  if (dataViewsService === null) {
    throw new Error('Data views are not initialized!');
  }

  if (id) {
    return dataViewsService.get(id);
  } else {
    return dataViewsService.create({});
  }
}

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
          defaultMessage: 'The data view {dataViewIndexPattern} is not based on a time series',
          values: { dataViewIndexPattern: dataView.getIndexPattern() },
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
 * Returns true if the index pattern contains a :
 * which means it is cross-cluster
 */
export function isCcsIndexPattern(indexPattern: string) {
  return indexPattern.includes(':');
}
