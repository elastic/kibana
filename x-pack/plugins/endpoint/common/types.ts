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
  static ALERT_INDEX_NAME = 'my-index';
  static ENDPOINT_INDEX_NAME = 'endpoint-agent*';
  static EVENT_INDEX_NAME = 'endpoint-events-*';
  /**
   * Legacy events are stored in indices with endgame-* prefix
   */
  static LEGACY_EVENT_INDEX_NAME = 'endgame-*';
}

export interface AlertResultList {
  /**
   * The alerts restricted by page size.
   */
  alerts: AlertData[];

  /**
   * The total number of alerts on the page.
   */
  total: number;

  /**
   * The size of the requested page.
   */
  request_page_size: number;

  /**
   * The index of the requested page, starting at 0.
   */
  request_page_index: number;

  /**
   * The offset of the requested page, starting at 0.
   */
  result_from_index: number;
}

export interface EndpointResultList {
  /* the endpoints restricted by the page size */
  endpoints: EndpointMetadata[];
  /* the total number of unique endpoints in the index */
  total: number;
  /* the page size requested */
  request_page_size: number;
  /* the page index requested */
  request_page_index: number;
}

export interface OSFields {
  full: string;
  name: string;
  version: string;
  variant: string;
}

export interface AlertData {
  '@timestamp': Date;
  agent: {
    id: string;
    version: string;
    name: string;
  };
  event: {
    action: string;
  };
  endpoint: {
    policy: {
      id: string;
    };
  };
  file_classification: {
    malware_classification: {
      score: number;
    };
  };
  host: {
    id: string;
    hostname: string;
    ip: string[];
    mac: string[];
    os: OSFields;
  };
  process: {
    entity_id: string;
    parent?: {
      entity_id?: string;
    };
  };
  thread: {};
}

export interface EndpointMetadata {
  '@timestamp': Date;
  event: {
    created: Date;
  };
  endpoint: {
    policy: {
      id: string;
    };
  };
  agent: {
    id: string;
    version: string;
    name: string;
  };
  host: {
    id: string;
    hostname: string;
    ip: string[];
    mac: string[];
    os: OSFields;
  };
}

export interface LegacyEndpointEvent {
  '@timestamp': Date;
  endgame: {
    event_type_full: string;
    event_subtype_full: string;
    unique_pid: number;
    unique_ppid: number;
    serial_event_id: number;
  };
  agent: {
    id: string;
    type: string;
  };
}

export interface EndpointEvent {
  '@timestamp': Date;
  agent: {
    id: string;
    version: string;
    name: string;
  };
  ecs: {
    version: string;
  };
  event: {
    category: string;
    type: string;
    id: string;
    kind: string;
  };
  host: {
    id: string;
    hostname: string;
    ip: string[];
    mac: string[];
    os: OSFields;
  };
  process: {
    entity_id: string;
    parent?: {
      entity_id?: string;
    };
  };
}

export type ResolverEvent = EndpointEvent | LegacyEndpointEvent;

/**
 * The PageId type is used for the payload when firing userNavigatedToPage actions
 */
export type PageId = 'alertsPage' | 'managementPage' | 'policyListPage';
