/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  FirstLastSeenHost,
  HostEcsFields,
  HostItem,
  HostsData,
  HostsSortField,
  SourceConfiguration,
  TimerangeInput,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { Hit, Hits, SearchHit } from '../types';

export interface HostsAdapter {
  getHosts(req: FrameworkRequest, options: HostsRequestOptions): Promise<HostsData>;
  getHostDetails(req: FrameworkRequest, options: HostDetailsRequestOptions): Promise<HostItem>;
  getHostFirstLastSeen(
    req: FrameworkRequest,
    options: HostLastFirstSeenRequestOptions
  ): Promise<FirstLastSeenHost>;
}

type StringOrNumber = string | number;

export interface HostHit extends Hit {
  _source: {
    '@timestamp'?: string;
    host: HostEcsFields;
  };
  cursor?: string;
  firstSeen?: string;
  sort?: StringOrNumber[];
}

export type HostHits = Hits<number, HostHit>;

export interface HostsRequestOptions extends RequestOptions {
  sort: HostsSortField;
}

export interface HostLastFirstSeenRequestOptions {
  hostName: string;
  sourceConfiguration: SourceConfiguration;
}

export interface HostDetailsRequestOptions extends HostLastFirstSeenRequestOptions {
  fields: string[];
  timerange: TimerangeInput;
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

export interface HostAggEsItem {
  key?: string;
  cloud_machine_type?: HostBuckets;
  firstSeen?: HostValue;
  lastSeen?: HostValue;
  host_architecture?: HostBuckets;
  host_id?: HostBuckets;
  host_ip?: HostBuckets;
  host_mac?: HostBuckets;
  host_name?: HostBuckets;
  host_os?: HostBuckets;
  host_os_name?: HostBuckets;
  host_os_version?: HostBuckets;
  host_type?: HostBuckets;
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
