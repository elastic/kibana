/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DoneInvokeEvent } from 'xstate';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { FindDatasetValue, SortOrder } from '../../../../common/latest';

export interface DataViewsSearchParams {
  datasetQuery?: string;
  sortOrder?: SortOrder;
}

export interface WithCache {
  cache: IHashedCache<DataViewsSearchParams, FindDatasetValue>;
}

export interface WithSearch {
  search: DataViewsSearchParams;
}

export interface WithDataViews {
  dataViews: DataView[];
}

export interface WithNullishDataViews {
  dataViews: null;
}

export interface WithError {
  error: Error;
}

export interface WithNullishError {
  error: null;
}

export type DefaultDataViewsContext = WithCache &
  WithNullishDataViews &
  WithSearch &
  WithNullishError;

type LoadingDataViewsContext = DefaultDataViewsContext;

type LoadedDataViewsContext = WithCache & WithDataViews & WithSearch & WithNullishError;

type LoadingFailedDataViewsContext = WithCache & WithNullishDataViews & WithSearch & WithError;

export type DataViewsTypestate =
  | {
      value: 'uninitialized';
      context: DefaultDataViewsContext;
    }
  | {
      value: 'loading';
      context: LoadingDataViewsContext;
    }
  | {
      value: 'loaded';
      context: LoadedDataViewsContext;
    }
  | {
      value: 'loadingFailed';
      context: LoadingFailedDataViewsContext;
    }
  | {
      value: 'debounceSearchingDataViews';
      context: LoadedDataViewsContext;
    };

export type DataViewsContext = DataViewsTypestate['context'];

export type DataViewsEvent =
  | {
      type: 'LOAD_DATA_VIEWS';
    }
  | {
      type: 'RELOAD_DATA_VIEWS';
    }
  | {
      type: 'SEARCH_DATA_VIEWS';
      search: DataViewsSearchParams;
    }
  | {
      type: 'SORT_DATA_VIEWS';
      search: DataViewsSearchParams;
    }
  | DoneInvokeEvent<FindDatasetValue | Error>;
