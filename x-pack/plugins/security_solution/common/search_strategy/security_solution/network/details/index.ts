/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';
import { HostEcs } from '../../../../ecs/host';
import { GeoEcs } from '../../../../ecs/geo';
import { Inspect, Maybe, TotalValue, Hit, ShardsResponse } from '../../../common';
import { RequestBasicOptions } from '../..';

export interface NetworkDetailsRequestOptions extends Omit<RequestBasicOptions, 'timerange'> {
  ip: string;
}

export interface NetworkDetailsStrategyResponse extends IEsSearchResponse {
  networkDetails: {
    client?: Maybe<NetworkDetails>;
    destination?: Maybe<NetworkDetails>;
    host?: HostEcs;
    server?: Maybe<NetworkDetails>;
    source?: Maybe<NetworkDetails>;
  };
  inspect?: Maybe<Inspect>;
}

export interface NetworkDetails {
  firstSeen?: Maybe<string>;
  lastSeen?: Maybe<string>;
  autonomousSystem: AutonomousSystem;
  geo: GeoEcs;
}

export interface AutonomousSystem {
  number?: Maybe<number>;
  organization?: Maybe<AutonomousSystemOrganization>;
}

export interface AutonomousSystemOrganization {
  name?: Maybe<string>;
}

interface ResultHit<T> {
  doc_count: number;
  results: {
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

export interface NetworkHit {
  took?: number;
  timed_out?: boolean;
  _scroll_id?: string;
  _shards?: ShardsResponse;
  timeout?: number;
  hits?: {
    total: number;
    hits: Hit[];
  };
  doc_count: number;
  geo: ResultHit<object>;
  autonomousSystem: ResultHit<object>;
  firstSeen: {
    value: number;
    value_as_string: string;
  };
  lastSeen: {
    value: number;
    value_as_string: string;
  };
}

export type NetworkDetailsHostHit = ResultHit<object>;

export interface NetworkDetailsHit {
  aggregations: {
    destination?: NetworkHit;
    source?: NetworkHit;
    host: ResultHit<object>;
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}
