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
  static RESOLVER_INDEX_NAME = 'endpoint-event-*';
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

export interface ResolverPhase0Data {
  endgame: {
    event_type_full: string;
    event_subtype_full: string;
    unique_pid: number;
    unique_ppid: number;
  };
  agent: {
    id: string;
  };
}

export interface ResolverPhase1Data {
  event: {
    category: string;
    type: string;
  };
  endpoint: {
    process: {
      entity_id: string;
      parent: {
        entity_id: string;
      };
    };
  };
}

export type ResolverData = ResolverPhase0Data | ResolverPhase1Data;

export interface ResolverResponseNode {
  entity_id: string | undefined;
  parent_entity_id: string | undefined;
  events: ResolverData[];
}

export interface ResolverChildrenResponse extends Pagination {
  origin: ResolverResponseNode;
  children: ResolverResponseNode[];
}

export interface ResolverNodeDetailsResponse extends Pagination {
  node: ResolverResponseNode;
}

export interface Pagination {
  total: number;
  request_page_size: number;
  request_page_index: number;
  request_from_index: number;
}

/**
 * The PageId type is used for the payload when firing userNavigatedToPage actions
 */
export type PageId = 'alertsPage' | 'endpointListPage' | 'resolverPage';
