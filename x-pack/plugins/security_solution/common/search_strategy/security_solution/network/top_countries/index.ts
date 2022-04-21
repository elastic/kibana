/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { CursorType, Inspect, Maybe, PageInfoPaginated } from '../../../common';
import { RequestOptionsPaginated } from '../..';
import {
  GeoItem,
  FlowTargetSourceDest,
  NetworkTopTablesFields,
  TopNetworkTablesEcsField,
} from '../common';

export interface TopCountriesItemSource {
  country?: Maybe<string>;
  destination_ips?: Maybe<number>;
  flows?: Maybe<number>;
  location?: Maybe<GeoItem>;
  source_ips?: Maybe<number>;
}

export interface NetworkTopCountriesRequestOptions
  extends RequestOptionsPaginated<NetworkTopTablesFields> {
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
