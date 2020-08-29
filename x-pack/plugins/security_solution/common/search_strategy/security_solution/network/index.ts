/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchResponse } from '../../../../../../../src/plugins/data/common';
import { GeoEcs } from '../../../ecs/geo';

import {
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  RequestOptionsPaginated,
  GenericBuckets,
} from '..';

export enum NetworkQueries {
  http = 'http',
  tls = 'tls',
  topCountries = 'topCountries',
}

export enum NetworkTopTablesFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips',
}

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut',
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

export interface NetworkHttpSortField {
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

export interface NetworkHttpRequestOptions extends RequestOptionsPaginated {
  ip?: string;
  networkHttpSort: NetworkHttpSortField;
  defaultIndex: string[];
}

export interface NetworkHttpStrategyResponse extends IEsSearchResponse {
  edges: NetworkHttpEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface GeoItem {
  geo?: Maybe<GeoEcs>;

  flowTarget?: Maybe<FlowTargetSourceDest>;
}

export interface TopCountriesItemSource {
  country?: Maybe<string>;

  destination_ips?: Maybe<number>;

  flows?: Maybe<number>;

  location?: Maybe<GeoItem>;

  source_ips?: Maybe<number>;
}

export interface NetworkTopCountriesRequestOptions extends RequestOptionsPaginated {
  networkTopCountriesSort: NetworkTopTablesSortField;
  flowTarget: FlowTargetSourceDest;
  ip?: string;
}

export interface NetworkTopCountriesStrategyResponse extends IEsSearchResponse {
  edges: NetworkTopCountriesEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface NetworkTopCountriesEdges {
  node: NetworkTopCountriesItem;

  cursor: CursorType;
}

export interface NetworkTopCountriesItem {
  _id?: Maybe<string>;

  source?: Maybe<TopCountriesItemSource>;

  destination?: Maybe<TopCountriesItemDestination>;

  network?: Maybe<TopNetworkTablesEcsField>;
}

export interface TopCountriesItemDestination {
  country?: Maybe<string>;

  destination_ips?: Maybe<number>;

  flows?: Maybe<number>;

  location?: Maybe<GeoItem>;

  source_ips?: Maybe<number>;
}

export interface TopNetworkTablesEcsField {
  bytes_in?: Maybe<number>;

  bytes_out?: Maybe<number>;
}

export interface NetworkTopTablesSortField {
  field: NetworkTopTablesFields;

  direction: Direction;
}

export interface NetworkTopCountriesBuckets {
  country: string;
  key: string;
  bytes_in: {
    value: number;
  };
  bytes_out: {
    value: number;
  };
  flows: number;
  destination_ips: number;
  source_ips: number;
}

export interface NetworkHttpData {
  edges: NetworkHttpEdges[];

  totalCount: number;

  pageInfo: PageInfoPaginated;

  inspect?: Maybe<Inspect>;
}

export interface NetworkHttpEdges {
  node: NetworkHttpItem;

  cursor: CursorType;
}

export interface NetworkHttpItem {
  _id?: Maybe<string>;

  domains: string[];

  lastHost?: Maybe<string>;

  lastSourceIp?: Maybe<string>;

  methods: string[];

  path?: Maybe<string>;

  requestCount?: Maybe<number>;

  statuses: string[];
}

export interface NetworkHttpBuckets {
  key: string;
  doc_count: number;
  domains: {
    buckets: GenericBuckets[];
  };
  methods: {
    buckets: GenericBuckets[];
  };
  source: object;
  status: {
    buckets: GenericBuckets[];
  };
}
