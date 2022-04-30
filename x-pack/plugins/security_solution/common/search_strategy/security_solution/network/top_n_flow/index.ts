/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import {
  GeoItem,
  FlowTargetSourceDest,
  TopNetworkTablesEcsField,
  NetworkTopTablesFields,
} from '../common';
import {
  CursorType,
  Inspect,
  Maybe,
  PageInfoPaginated,
  TotalValue,
  GenericBuckets,
} from '../../../common';
import { RequestOptionsPaginated } from '../..';

export interface NetworkTopNFlowRequestOptions
  extends RequestOptionsPaginated<NetworkTopTablesFields> {
  flowTarget: FlowTargetSourceDest;
  ip?: Maybe<string>;
}

export interface NetworkTopNFlowStrategyResponse extends IEsSearchResponse {
  edges: NetworkTopNFlowEdges[];
  totalCount: number;
  pageInfo: PageInfoPaginated;
  inspect?: Maybe<Inspect>;
}

export interface NetworkTopNFlowEdges {
  node: NetworkTopNFlowItem;
  cursor: CursorType;
}

export interface NetworkTopNFlowItem {
  _id?: Maybe<string>;
  source?: Maybe<TopNFlowItemSource>;
  destination?: Maybe<TopNFlowItemDestination>;
  network?: Maybe<TopNetworkTablesEcsField>;
}

export interface TopNFlowItemSource {
  autonomous_system?: Maybe<AutonomousSystemItem>;
  domain?: Maybe<string[]>;
  ip?: Maybe<string>;
  location?: Maybe<GeoItem>;
  flows?: Maybe<number>;
  destination_ips?: Maybe<number>;
}

export interface AutonomousSystemItem {
  name?: Maybe<string>;
  number?: Maybe<number>;
}

export interface TopNFlowItemDestination {
  autonomous_system?: Maybe<AutonomousSystemItem>;
  domain?: Maybe<string[]>;
  ip?: Maybe<string>;
  location?: Maybe<GeoItem>;
  flows?: Maybe<number>;
  source_ips?: Maybe<number>;
}

export interface AutonomousSystemHit<T> {
  doc_count: number;
  top_as: {
    hits: {
      total: TotalValue | number;
      max_score: number | null;
      hits: Array<{
        _source: T;
        sort?: [number];
        _index?: string;
        _type?: string;
        _id?: string;
        _score?: number | null;
      }>;
    };
  };
}

export interface NetworkTopNFlowBuckets {
  key: string;
  autonomous_system: AutonomousSystemHit<object>;
  bytes_in: {
    value: number;
  };
  bytes_out: {
    value: number;
  };
  domain: {
    buckets: GenericBuckets[];
  };
  location: LocationHit<object>;
  flows: number;
  destination_ips?: number;
  source_ips?: number;
}

export interface LocationHit<T> {
  doc_count: number;
  top_geo: {
    hits: {
      total: TotalValue | number;
      max_score: number | null;
      hits: Array<{
        _source: T;
        sort?: [number];
        _index?: string;
        _type?: string;
        _id?: string;
        _score?: number | null;
      }>;
    };
  };
}
