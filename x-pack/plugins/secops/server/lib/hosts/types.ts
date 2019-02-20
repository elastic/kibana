/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostEcsFields, HostsData } from '../../graphql/types';
import { FrameworkRequest, RequestOptions } from '../framework';
import { Hit, Hits, SearchHit } from '../types';

export interface HostsAdapter {
  getHosts(req: FrameworkRequest, options: RequestOptions): Promise<HostsData>;
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

export interface HostBucket {
  key?: { host_name: string };
  host: HostHits;
  firstSeen: {
    value: number;
    value_as_string: string;
  };
}

export interface HostData extends SearchHit {
  sort: string[];
  aggregations: {
    host_count: {
      value: number;
    };
    group_by_host: {
      after_key: string;
      buckets: HostBucket[];
    };
  };
}
