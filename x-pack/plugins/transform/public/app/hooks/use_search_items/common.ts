/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';

import { matchAllQuery } from '../../common';

import { isDataView } from '../../../../common/types/data_view';

export type SavedSearchQuery = object;

let dataViewCache: DataView[] = [];

export let refreshDataViews: () => Promise<unknown>;

export async function loadDataViews(dataViewsContract: DataViewsContract) {
  dataViewCache = await dataViewsContract.find('*', 10000);
  return dataViewCache;
}

export function getDataViewIdByTitle(dataViewTitle: string): string | undefined {
  return dataViewCache.find(({ title }) => title === dataViewTitle)?.id;
}

type CombinedQuery = Record<'bool', any> | object;

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
