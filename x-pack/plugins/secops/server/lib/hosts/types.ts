/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HostsData,
  PaginationInput,
  SourceConfiguration,
  TimerangeInput,
} from '../../graphql/types';
import { FrameworkRequest } from '../framework';
import { ESQuery, Hit, Hits, SearchHit } from '../types';

export interface HostsAdapter {
  getHosts(req: FrameworkRequest, options: HostsRequestOptions): Promise<HostsData>;
}

export interface HostsRequestOptions {
  sourceConfiguration: SourceConfiguration;
  pagination: PaginationInput;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
  fields: string[];
}

type StringOrNumber = string | number;

export interface HostHit extends Hit {
  _source: {
    '@timestamp'?: string;
    host: {
      id?: string;
      name: string;
      os?: {
        name: string;
        version: string;
      };
    };
  };
  cursor?: string;
  sort?: StringOrNumber[];
}

export type HostHits = Hits<number, HostHit>;

export interface HostBucket {
  key?: { host_name: string };
  host: HostHits;
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
