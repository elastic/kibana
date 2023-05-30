/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DoneInvokeEvent } from 'xstate';
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
  dataStreams: DataStream[];
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

export type DefaultDataStreamsContext = WithCache &
  WithNullishDataStreams &
  WithSearch &
  WithNullishError;

type LoadingDataStreamsContext = DefaultDataStreamsContext;

type LoadedDataStreamsContext = WithCache & WithDataStreams & WithSearch & WithNullishError;

type LoadingFailedDataStreamsContext = WithCache & WithNullishDataStreams & WithSearch & WithError;

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
      value: 'debounceSearchingDataStreams';
      context: LoadedDataStreamsContext;
    };

export type DataStreamsContext = DataStreamsTypestate['context'];

export type DataStreamsEvent =
  | {
      type: 'LOAD_DATA_STREAMS';
    }
  | {
      type: 'RELOAD_DATA_STREAMS';
    }
  | {
      type: 'SEARCH_DATA_STREAMS';
      search: DataStreamsSearchParams;
    }
  | {
      type: 'SORT_DATA_STREAMS';
      search: DataStreamsSearchParams;
    }
  | DoneInvokeEvent<any>;
