/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A deep readonly type that will make all children of a given object readonly recursively
 */
export type Immutable<T> = T extends undefined | null | boolean | string | number
  ? T
  : T extends Array<infer U>
  ? ImmutableArray<U>
  : T extends Map<infer K, infer V>
  ? ImmutableMap<K, V>
  : T extends Set<infer M>
  ? ImmutableSet<M>
  : ImmutableObject<T>;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export class EndpointAppConstants {
  static ENDPOINT_INDEX_NAME = 'endpoint-agent*';
}

export interface EndpointResultList {
  // the endpoint restricted by the page size
  endpoints: EndpointMetadata[];
  // the total number of unique endpoints in the index
  total: number;
  // the page size requested
  request_page_size: number;
  // the index requested
  request_page_index: number;
}

export interface EndpointMetadata {
  event: {
    created: Date;
  };
  endpoint: {
    policy: {
      id: string;
    };
  };
  agent: {
    version: string;
    id: string;
  };
  host: {
    id: string;
    hostname: string;
    ip: string[];
    mac: string[];
    os: {
      name: string;
      full: string;
      version: string;
    };
  };
}

export interface AlertData {
  value: {
    source: {
      endgame: {
        data: {
          file_operation: string;
          malware_classification: {
            score: number;
          };
        };
        metadata: {
          key: string;
        };
        timestamp_utc: Date;
      };
      labels: {
        endpoint_id: string;
      };
      host: {
        hostname: string;
        ip: string;
        os: {
          name: string;
        };
      };
    };
  };
}

/**
 * The PageId type is used for the payload when firing userNavigatedToPage actions
 */
export type PageId = 'alertsPage' | 'policyListPage' | 'endpointListPage';
