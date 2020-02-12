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
  static BASE_API_URL = '/api/endpoint';
  static ALERT_INDEX_NAME = 'my-index';
  static ENDPOINT_INDEX_NAME = 'endpoint-agent*';
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
  request_page_index: number | undefined;

  /**
   * The offset of the requested page, starting at 0.
   */
  result_from_index: number | undefined;

  /**
   * A cursor-based URL for the next page.
   */
  next: string | null;

  /**
   * A cursor-based URL for the previous page.
   */
  prev: string | null;
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

export interface AlertData {
  id: string;
  '@timestamp': Date;
  agent: {
    id: string;
    version: string;
  };
  event: {
    id: number;
    action: string;
  };
  file_classification: {
    malware_classification: {
      score: number;
    };
  };
  host: {
    hostname: string;
    ip: string;
    os: {
      name: string;
    };
  };
  process: {
    pid: number;
  };
  thread: {};
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

export interface ESTotal {
  value: number;
  relation: string;
}

export interface AlertDataWrapper {
  _id: string;
  _source: AlertData;
}

export type AlertHits = AlertDataWrapper[];

/**
 * The PageId type is used for the payload when firing userNavigatedToPage actions
 */
export type PageId = 'alertsPage' | 'endpointListPage';
