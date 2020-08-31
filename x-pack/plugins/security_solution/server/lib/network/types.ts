/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  NetworkDnsData,
  NetworkHttpData,
  NetworkTopCountriesData,
  NetworkTopNFlowData,
} from '../../graphql/types';
import { FrameworkRequest, RequestOptionsPaginated } from '../framework';
import { TotalValue } from '../types';
import { NetworkDnsRequestOptions } from '.';

export interface NetworkAdapter {
  getNetworkTopCountries(
    req: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<NetworkTopCountriesData>;
  getNetworkTopNFlow(
    req: FrameworkRequest,
    options: RequestOptionsPaginated
  ): Promise<NetworkTopNFlowData>;
  getNetworkDns(req: FrameworkRequest, options: NetworkDnsRequestOptions): Promise<NetworkDnsData>;
  getNetworkHttp(req: FrameworkRequest, options: RequestOptionsPaginated): Promise<NetworkHttpData>;
}

export interface GenericBuckets {
  key: string;
  doc_count: number;
}

interface LocationHit<T> {
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

interface AutonomousSystemHit<T> {
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

interface HttpHit<T> {
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

export interface NetworkHttpBuckets {
  key: string;
  doc_count: number;
  domains: {
    buckets: GenericBuckets[];
  };
  methods: {
    buckets: GenericBuckets[];
  };
  source: HttpHit<object>;
  status: {
    buckets: GenericBuckets[];
  };
}

interface DnsHistogramSubBucket {
  key: string;
  doc_count: number;
  orderAgg: {
    value: number;
  };
}
interface DnsHistogramBucket {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: DnsHistogramSubBucket[];
}

export interface DnsHistogramGroupData {
  key: number;
  doc_count: number;
  key_as_string: string;
  histogram: DnsHistogramBucket;
}
