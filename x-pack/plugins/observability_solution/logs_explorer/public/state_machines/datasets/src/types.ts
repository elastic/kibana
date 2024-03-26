/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DoneInvokeEvent } from 'xstate';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { FindDatasetValue, SortOrder } from '../../../../common/latest';
import { Dataset } from '../../../../common/datasets';

export interface DatasetsSearchParams {
  datasetQuery?: string;
  sortOrder?: SortOrder;
}

export interface WithCache {
  cache: IHashedCache<DatasetsSearchParams, FindDatasetValue>;
}

export interface WithSearch {
  search: DatasetsSearchParams;
}

export interface WithDatasets {
  datasets: Dataset[];
}

export interface WithNullishDatasets {
  datasets: null;
}

export interface WithError {
  error: Error;
}

export interface WithNullishError {
  error: null;
}

export type DefaultDatasetsContext = WithCache &
  WithNullishDatasets &
  WithSearch &
  WithNullishError;

type LoadingDatasetsContext = DefaultDatasetsContext;

type LoadedDatasetsContext = WithCache & WithDatasets & WithSearch & WithNullishError;

type LoadingFailedDatasetsContext = WithCache & WithNullishDatasets & WithSearch & WithError;

export type DatasetsTypestate =
  | {
      value: 'uninitialized';
      context: DefaultDatasetsContext;
    }
  | {
      value: 'loading';
      context: LoadingDatasetsContext;
    }
  | {
      value: 'loaded';
      context: LoadedDatasetsContext;
    }
  | {
      value: 'loadingFailed';
      context: LoadingFailedDatasetsContext;
    }
  | {
      value: 'debounceSearchingDatasets';
      context: LoadedDatasetsContext;
    };

export type DatasetsContext = DatasetsTypestate['context'];

export type DatasetsEvent =
  | {
      type: 'LOAD_DATASETS';
    }
  | {
      type: 'RELOAD_DATASETS';
    }
  | {
      type: 'SEARCH_DATASETS';
      search: DatasetsSearchParams;
    }
  | DoneInvokeEvent<FindDatasetValue | Error>;
