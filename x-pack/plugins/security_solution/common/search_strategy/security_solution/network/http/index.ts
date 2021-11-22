/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { Maybe, CursorType, Inspect, PageInfoPaginated, GenericBuckets } from '../../../common';
import { RequestOptionsPaginated } from '../..';

export enum NetworkHttpFields {
  domains = 'domains',
  lastHost = 'lastHost',
  lastSourceIp = 'lastSourceIp',
  methods = 'methods',
  path = 'path',
  requestCount = 'requestCount',
  statuses = 'statuses',
}

export interface NetworkHttpRequestOptions extends RequestOptionsPaginated {
  ip?: string;
  defaultIndex: string[];
}

export interface NetworkHttpStrategyResponse extends IEsSearchResponse {
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
