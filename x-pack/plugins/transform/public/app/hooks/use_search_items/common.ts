/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { SavedObjectsClientContract, SimpleSavedObject, IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { DataView, DataViewAttributes, DataViewsContract } from '@kbn/data-views-plugin/public';

import { matchAllQuery } from '../../common';

import { isDataView } from '../../../../common/types/data_view';

export type SavedSearchQuery = object;

type DataViewId = string;

let dataViewCache: Array<SimpleSavedObject<Record<string, any>>> = [];
let fullDataViews;
let currentDataView = null;

export let refreshDataViews: () => Promise<unknown>;

export function loadDataViews(
  savedObjectsClient: SavedObjectsClientContract,
  dataViews: DataViewsContract
) {
  fullDataViews = dataViews;
  return savedObjectsClient
    .find<DataViewAttributes>({
      type: 'index-pattern',
      fields: ['id', 'title', 'type', 'fields'],
      perPage: 10000,
    })
    .then((response) => {
      dataViewCache = response.savedObjects;

      if (refreshDataViews === null) {
        refreshDataViews = () => {
          return new Promise((resolve, reject) => {
            loadDataViews(savedObjectsClient, dataViews)
              .then((resp) => {
                resolve(resp);
              })
              .catch((error) => {
                reject(error);
              });
          });
        };
      }

      return dataViewCache;
    });
}

export function getDataViewIdByTitle(dataViewTitle: string): string | undefined {
  return dataViewCache.find((d) => d?.attributes?.title === dataViewTitle)?.id;
}

type CombinedQuery = Record<'bool', any> | object;

export function loadCurrentDataView(dataViews: DataViewsContract, dataViewId: DataViewId) {
  fullDataViews = dataViews;
  currentDataView = fullDataViews.get(dataViewId);
  return currentDataView;
}

export interface SearchItems {
  dataView: DataView;
  savedSearch: any;
  query: any;
  combinedQuery: CombinedQuery;
}

// Helper for creating the items used for searching and job creation.
export function createSearchItems(
  dataView: DataView | undefined,
  savedSearch: any,
  config: IUiSettingsClient
): SearchItems {
  // query is only used by the data visualizer as it needs
  // a lucene query_string.
  // Using a blank query will cause match_all:{} to be used
  // when passed through luceneStringToDsl
  let query = {
    query: '',
    language: 'lucene',
  };

  let combinedQuery: CombinedQuery = {
    bool: {
      must: [matchAllQuery],
    },
  };

  if (!isDataView(dataView) && savedSearch !== null && savedSearch.id !== undefined) {
    const searchSource = savedSearch.searchSource;
    dataView = searchSource.getField('index') as DataView;

    query = searchSource.getField('query');
    const fs = searchSource.getField('filter');

    const filters = fs.length ? fs : [];

    const esQueryConfigs = getEsQueryConfig(config);
    combinedQuery = buildEsQuery(dataView, [query], filters, esQueryConfigs);
  }

  if (!isDataView(dataView)) {
    throw new Error('Data view is not defined.');
  }

  return {
    dataView,
    savedSearch,
    query,
    combinedQuery,
  };
}
