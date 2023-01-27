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
import { getToastNotifications, getSavedObjectsClient, getDataViews } from './dependency_cache';

let indexPatternCache: DataView[] = [];
let savedSearchesCache: SavedSearchSavedObject[] = [];
let indexPatternsContract: DataViewsContract | null = null;

export async function loadIndexPatterns(indexPatterns: DataViewsContract) {
  indexPatternsContract = indexPatterns;
  const dataViewsContract = getDataViews();
  const idsAndTitles = await dataViewsContract.getIdsWithTitle();

  const dataViewsThatExist = (
    await Promise.allSettled(
      // attempt to load the fields for every data view.
      // if the index doesn't exist an error is thrown which we can catch.
      // This is preferable to the get function which display an
      // error toast for every missing index.
      idsAndTitles.map(({ title }) => dataViewsContract.getFieldsForIndexPattern({ title }))
    )
  ).reduce<string[]>((acc, { status }, i) => {
    if (status === 'fulfilled') {
      acc.push(idsAndTitles[i].id);
    }
    return acc;
  }, []);

  // load each data view which has a real index behind it.
  indexPatternCache = await Promise.all(dataViewsThatExist.map(dataViewsContract.get));
  return indexPatternCache;
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

export function getIndexPatterns() {
  return indexPatternCache;
}

export function getIndexPatternsContract() {
  return indexPatternsContract;
}

export function getIndexPatternNames() {
  return indexPatternCache.map((i) => i.title);
}

export function getIndexPatternIdFromName(name: string) {
  return indexPatternCache.find((i) => i.title === name)?.id ?? null;
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

export function getQueryFromSavedSearch(savedSearch: SavedSearchSavedObject) {
  const search = savedSearch.attributes.kibanaSavedObjectMeta as { searchSourceJSON: string };
  return JSON.parse(search.searchSourceJSON) as {
    query: Query;
    filter: any[];
  };
}

export function getIndexPatternById(id: string): Promise<DataView> {
  if (indexPatternsContract !== null) {
    if (id) {
      return indexPatternsContract.get(id);
    } else {
      return indexPatternsContract.create({});
    }
  } else {
    throw new Error('Index patterns are not initialized!');
  }
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
        title: i18n.translate('xpack.ml.indexPatternNotBasedOnTimeSeriesNotificationTitle', {
          defaultMessage: 'The index pattern {indexPatternTitle} is not based on a time series',
          values: { indexPatternTitle: indexPattern.title },
        }),
        text: i18n.translate('xpack.ml.indexPatternNotBasedOnTimeSeriesNotificationDescription', {
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
export function isCcsIndexPattern(indexPatternTitle: string) {
  return indexPatternTitle.includes(':');
}
