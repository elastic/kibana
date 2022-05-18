/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { CursorType, Inspect, Maybe, PageInfoPaginated } from '../../../common';
import { RequestOptionsPaginated } from '../..';
import { FlowTargetSourceDest } from '../common';

export interface NetworkTlsBuckets {
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

export interface NetworkTlsNode {
  _id?: Maybe<string>;
  timestamp?: Maybe<string>;
  notAfter?: Maybe<string[]>;
  subjects?: Maybe<string[]>;
  ja3?: Maybe<string[]>;
  issuers?: Maybe<string[]>;
}

export enum NetworkTlsFields {
  _id = '_id',
}

export interface NetworkTlsEdges {
  node: NetworkTlsNode;
  cursor: CursorType;
}

export interface NetworkTlsRequestOptions extends RequestOptionsPaginated<NetworkTlsFields> {
  ip: string;
  flowTarget: FlowTargetSourceDest;
  defaultIndex: string[];
}

export interface NetworkTlsStrategyResponse extends IEsSearchResponse {
  edges: NetworkTlsEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}
