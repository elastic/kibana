/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudEcs, HostEcs, OsEcs } from '@kbn/securitysolution-ecs';
import type { Hit, Hits, Maybe, SearchHit, StringOrNumber, TotalValue } from '../../../common';
import type { EndpointPendingActions, HostInfo } from '../../../../endpoint/types';
import type { CommonFields } from '../..';

export enum HostPolicyResponseActionStatus {
  success = 'success',
  failure = 'failure',
  warning = 'warning',
  unsupported = 'unsupported',
}

export interface EndpointFields {
  /** A count of pending endpoint actions against the host */
  pendingActions?: Maybe<EndpointPendingActions['pending_actions']>;
  id?: Maybe<string>;
  /** The complete Endpoint Host Details information (which also includes some of the fields above */
  hostInfo?: HostInfo;
}

interface AgentFields {
  id?: Maybe<string>;
}

export interface HostItem {
  _id?: Maybe<string>;
  agent?: Maybe<AgentFields>;
  cloud?: Maybe<CloudEcs>;
  endpoint?: Maybe<EndpointFields>;
  host?: Maybe<HostEcs>;
  lastSeen?: Maybe<string[]>;
  risk?: string;
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

type HostOsFields = CommonFields &
  Partial<{
    [Property in keyof OsEcs as `host.os.${Property}`]: unknown[];
  }>;

export interface HostOsHitsItem {
  hits: {
    total: TotalValue | number;
    max_score: number | null;
    hits: Array<{
      fields: HostOsFields;
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
  endpoint?: {
    id: HostBuckets;
  };
  host_architecture?: HostBuckets;
  host_id?: HostBuckets;
  host_ip?: HostBuckets;
  host_mac?: HostBuckets;
  host_name?: HostBuckets;
  host_os_name?: HostBuckets;
  host_os_version?: HostBuckets;
  host_type?: HostBuckets;
  key?: string;
  os?: HostOsHitsItem;
}

export interface HostAggEsData extends SearchHit {
  sort: string[];
  aggregations: HostAggEsItem;
}

type HostFields = CommonFields &
  Partial<{
    [Property in keyof HostEcs as `host.${Property}`]: unknown[];
  }>;

export interface HostHit extends Hit {
  fields: HostFields;
  cursor?: string;
  firstSeen?: string;
  sort?: StringOrNumber[];
}

export type HostHits = Hits<number, HostHit>;
