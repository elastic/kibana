/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';

import { CursorType, Inspect, Maybe, PageInfoPaginated, RequestOptionsPaginated } from '..';

export * from './common';
export * from './dns';
export * from './http';
export * from './top_countries';
export * from './top_n_flow';

export enum NetworkQueries {
  dns = 'dns',
  http = 'http',
  tls = 'tls',
  topCountries = 'topCountries',
  topNFlow = 'topNFlow',
}

export interface TlsBuckets {
  key: string;
  timestamp?: {
    value: number;
    value_as_string: string;
  };

  subjects: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  ja3: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  issuers: {
    buckets: Readonly<Array<{ key: string; doc_count: number }>>;
  };

  not_after: {
    buckets: Readonly<Array<{ key: number; key_as_string: string; doc_count: number }>>;
  };
}

export interface TlsNode {
  _id?: Maybe<string>;

  timestamp?: Maybe<string>;

  notAfter?: Maybe<string[]>;

  subjects?: Maybe<string[]>;

  ja3?: Maybe<string[]>;

  issuers?: Maybe<string[]>;
}

export enum FlowTarget {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source',
}

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

export enum TlsFields {
  _id = '_id',
}

export interface TlsEdges {
  node: TlsNode;

  cursor: CursorType;
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export interface TlsSortField {
  field: TlsFields;

  direction: Direction;
}

export interface NetworkTlsRequestOptions extends RequestOptionsPaginated {
  ip: string;
  flowTarget: FlowTargetSourceDest;
  sort: TlsSortField;
  defaultIndex: string[];
}

export interface NetworkTlsStrategyResponse extends IEsSearchResponse {
  edges: TlsEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}
