/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CloudEcs } from '../../../ecs/cloud';
import { HostEcs, OsEcs } from '../../../ecs/host';
import { Hit, Hits, Maybe, SearchHit, StringOrNumber, TotalValue } from '../../common';

export enum HostPolicyResponseActionStatus {
  success = 'success',
  failure = 'failure',
  warning = 'warning',
}

export enum HostsFields {
  lastSeen = 'lastSeen',
  hostName = 'hostName',
}

export interface EndpointFields {
  endpointPolicy?: Maybe<string>;
  sensorVersion?: Maybe<string>;
  policyStatus?: Maybe<HostPolicyResponseActionStatus>;
}

export interface HostItem {
  _id?: Maybe<string>;
  cloud?: Maybe<CloudEcs>;
  endpoint?: Maybe<EndpointFields>;
  host?: Maybe<HostEcs>;
  lastSeen?: Maybe<string>;
}

export interface HostValue {
  value: number;
  value_as_string: string;
}

export interface HostBucketItem {
  key: string;
  doc_count: number;
  timestamp: HostValue;
}

export interface HostBuckets {
  buckets: HostBucketItem[];
}

export interface HostOsHitsItem {
  hits: {
    total: TotalValue | number;
    max_score: number | null;
    hits: Array<{
      _source: { host: { os: Maybe<OsEcs> } };
      sort?: [number];
      _index?: string;
      _type?: string;
      _id?: string;
      _score?: number | null;
    }>;
  };
}

export interface HostAggEsItem {
  cloud_instance_id?: HostBuckets;
  cloud_machine_type?: HostBuckets;
  cloud_provider?: HostBuckets;
  cloud_region?: HostBuckets;
  firstSeen?: HostValue;
  host_architecture?: HostBuckets;
  host_id?: HostBuckets;
  host_ip?: HostBuckets;
  host_mac?: HostBuckets;
  host_name?: HostBuckets;
  host_os_name?: HostBuckets;
  host_os_version?: HostBuckets;
  host_type?: HostBuckets;
  key?: string;
  lastSeen?: HostValue;
  os?: HostOsHitsItem;
}

export interface HostEsData extends SearchHit {
  sort: string[];
  aggregations: {
    host_count: {
      value: number;
    };
    host_data: {
      buckets: HostAggEsItem[];
    };
  };
}

export interface HostAggEsData extends SearchHit {
  sort: string[];
  aggregations: HostAggEsItem;
}

export interface HostHit extends Hit {
  _source: {
    '@timestamp'?: string;
    host: HostEcs;
  };
  cursor?: string;
  firstSeen?: string;
  sort?: StringOrNumber[];
}

export type HostHits = Hits<number, HostHit>;
