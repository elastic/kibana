/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { CursorType, Inspect, Maybe, PageInfoPaginated, SortField } from '../../../common';
import { RequestOptionsPaginated } from '../..';

export enum NetworkDnsFields {
  dnsName = 'dnsName',
  queryCount = 'queryCount',
  uniqueDomains = 'uniqueDomains',
  dnsBytesIn = 'dnsBytesIn',
  dnsBytesOut = 'dnsBytesOut',
}

export interface NetworkDnsRequestOptions extends RequestOptionsPaginated {
  isPtrIncluded: boolean;
  sort: SortField<NetworkDnsFields>;
  stackByField?: Maybe<string>;
}

export interface NetworkDnsStrategyResponse extends IEsSearchResponse {
  edges: NetworkDnsEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
  histogram?: Maybe<MatrixOverOrdinalHistogramData[]>;
}

export interface NetworkDnsEdges {
  node: NetworkDnsItem;
  cursor: CursorType;
}

export interface NetworkDnsItem {
  _id?: Maybe<string>;
  dnsBytesIn?: Maybe<number>;
  dnsBytesOut?: Maybe<number>;
  dnsName?: Maybe<string>;
  queryCount?: Maybe<number>;
  uniqueDomains?: Maybe<number>;
}

export interface MatrixOverOrdinalHistogramData {
  x: string;
  y: number;
  g: string;
}

export interface NetworkDnsBuckets {
  key: string;
  doc_count: number;
  unique_domains: {
    value: number;
  };
  dns_bytes_in: {
    value: number;
  };
  dns_bytes_out: {
    value: number;
  };
}
