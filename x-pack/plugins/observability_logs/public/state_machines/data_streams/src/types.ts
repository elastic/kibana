/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IImmutableCache } from '../../../../common/immutable_cache';
import { FindDataStreamsResponse, SortOrder } from '../../../../common/latest';
import { DataStream } from '../../../../common/data_streams';

export interface DataStreamsSearchParams {
  datasetQuery?: string;
  sortOrder?: SortOrder;
}

interface WithCache {
  cache: IImmutableCache<DataStreamsSearchParams, FindDataStreamsResponse>;
}

interface WithSearch {
  search: DataStreamsSearchParams;
}

interface WithDataStreams {
  dataStreams: DataStream[] | null;
}

interface WithNullishDataStreams {
  dataStreams: null;
}

interface WithError {
  error: Error;
}

interface WithNullishError {
  error: null;
}

interface WithTotal {
  total: number;
}

export type DefaultDataStreamsContext = WithCache &
  WithNullishDataStreams &
  WithSearch &
  WithNullishError;

type LoadingDataStreamsContext = DefaultDataStreamsContext;

type LoadedDataStreamsContext = WithCache &
  WithDataStreams &
  WithTotal &
  WithSearch &
  WithNullishError;

type LoadingFailedDataStreamsContext = WithCache &
  WithDataStreams &
  Partial<WithTotal> &
  WithSearch &
  WithError;

type SearchingDataStreamsContext = LoadedDataStreamsContext | LoadingFailedDataStreamsContext;

export type DataStreamsTypestate =
  | {
      value: 'uninitialized';
      context: DefaultDataStreamsContext;
    }
  | {
      value: 'loading';
      context: LoadingDataStreamsContext;
    }
  | {
      value: 'loaded';
      context: LoadedDataStreamsContext;
    }
  | {
      value: 'loadingFailed';
      context: LoadingFailedDataStreamsContext;
    }
  | {
      value: 'debouncingSearch';
      context: SearchingDataStreamsContext;
    };

export type DataStreamsContext = DataStreamTypestate['context'];

export type DataStreamsEvent =
  | {
      type: 'LOAD_DATA_STREAMS';
    }
  | {
      type: 'LOADING_SUCCEEDED';
      data: FindDataStreamsResponse;
    }
  | {
      type: 'LOADING_FAILED';
      error: Error;
    }
  | {
      type: 'RELOAD_DATA_STREAMS';
    }
  | {
      type: 'SEARCH';
      search: DataStreamsSearchParams;
      delay?: number;
    };
