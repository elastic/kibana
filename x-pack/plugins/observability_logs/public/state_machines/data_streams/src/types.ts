/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IImmutableCache } from '../../../../common/immutable_cache';
import {
  FindDataStreamsRequestQuery,
  FindDataStreamsResponse,
  SortOrder,
} from '../../../../common/latest';
import { DataStream } from '../../../../common/data_streams';

export interface DefaultDataStreamsContext {
  cache: IImmutableCache<FindDataStreamsRequestQuery, FindDataStreamsResponse>;
  dataStreams: DataStream[] | null;
  error: Error | null;
  search: FindDataStreamsRequestQuery;
}

export interface DataStreamsSearchParams {
  datasetQuery?: string;
  sortOrder?: SortOrder;
}

export type IntegrationTypestate =
  | {
      value: 'uninitialized';
      context: DefaultDataStreamsContext;
    }
  | {
      value: 'loading';
      context: DefaultDataStreamsContext;
    }
  | {
      value: 'loaded';
      context: DefaultDataStreamsContext;
    }
  | {
      value: 'loadingFailed';
      context: DefaultDataStreamsContext;
    }
  | {
      value: 'debouncingSearch';
      context: DefaultDataStreamsContext;
    };

export type DataStreamsContext = IntegrationTypestate['context'];

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
