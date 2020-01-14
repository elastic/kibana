/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';

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

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export class EndpointAppConstants {
  static BASE_API_URL = '/api/endpoint';
  static ALERT_INDEX_NAME = 'my-index';
  static ENDPOINT_INDEX_NAME = 'endpoint-agent*';
  static EVENT_INDEX_NAME = 'endpoint-events-*';
  static DEFAULT_TOTAL_HITS = 10000;
  /**
   * Legacy events are stored in indices with endgame-* prefix
   */
  static LEGACY_EVENT_INDEX_NAME = 'endgame-*';

  /**
   * Alerts
   **/
  static ALERT_LIST_DEFAULT_PAGE_SIZE = 10;
  static ALERT_LIST_DEFAULT_SORT = '@timestamp';
  static ALERT_LIST_DEFAULT_ORDER = Direction.desc;
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
  request_page_index?: number;

  /**
   * The offset of the requested page, starting at 0.
   */
  result_from_index?: number;

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

export interface OSFields {
  full: string;
  name: string;
  version: string;
  variant: string;
}
export interface HostFields {
  id: string;
  hostname: string;
  ip: string[];
  mac: string[];
  os: OSFields;
}
export interface HashFields {
  md5: string;
  sha1: string;
  sha256: string;
}
export interface MalwareClassifierFields {
  identifier: string;
  score: number;
  threshold: number;
  version: string;
}
export interface PrivilegesFields {
  description: string;
  name: string;
  enabled: boolean;
}
export interface ThreadFields {
  id: number;
  service_name: string;
  start: number;
  start_address: number;
  start_address_module: string;
}
export interface DllFields {
  pe: {
    architecture: string;
    imphash: string;
  };
  code_signature: {
    subject_name: string;
    trusted: boolean;
  };
  compile_time: number;
  hash: HashFields;
  malware_classifier: MalwareClassifierFields;
  mapped_address: number;
  mapped_size: number;
  path: string;
}

/**
 * Describes an Alert Event.
 * Should be in line with ECS schema.
 */
export type AlertEvent = Immutable<{
  '@timestamp': number;
  agent: {
    id: string;
    version: string;
  };
  event: {
    id: string;
    action: string;
    category: string;
    kind: string;
    dataset: string;
    module: string;
    type: string;
  };
  process: {
    code_signature: {
      subject_name: string;
      trusted: boolean;
    };
    command_line: string;
    domain: string;
    pid: number;
    ppid: number;
    entity_id: string;
    parent: {
      pid: number;
      entity_id: string;
    };
    name: string;
    hash: HashFields;
    pe: {
      imphash: string;
    };
    executable: string;
    sid: string;
    start: number;
    malware_classifier: MalwareClassifierFields;
    token: {
      domain: string;
      type: string;
      user: string;
      sid: string;
      integrity_level: number;
      integrity_level_name: string;
      privileges: PrivilegesFields[];
    };
    thread: ThreadFields[];
    uptime: number;
    user: string;
  };
  file: {
    owner: string;
    name: string;
    path: string;
    accessed: number;
    mtime: number;
    created: number;
    size: number;
    hash: HashFields;
    pe: {
      imphash: string;
    };
    code_signature: {
      trusted: boolean;
      subject_name: string;
    };
    malware_classifier: {
      features: {
        data: {
          buffer: string;
          decompressed_size: number;
          encoding: string;
        };
      };
    } & MalwareClassifierFields;
    temp_file_path: string;
  };
  host: HostFields;
  thread: {};
  dll: DllFields[];
}>;

/**
 * Metadata associated with an alert event.
 */
interface AlertMetadata {
  id: string;

  // Alert Details Pagination
  next: string | null;
  prev: string | null;
}

/**
 * Union of alert data and metadata.
 */
export type AlertData = AlertEvent & AlertMetadata;

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
    name: string;
  };
  host: HostFields;
}

/**
 * Represents `total` response from Elasticsearch after ES 7.0.
 */
export interface ESTotal {
  value: number;
  relation: string;
}

/**
 * `Hits` array in responses from ES search API.
 */
export type AlertHits = SearchResponse<AlertEvent>['hits']['hits'];

export interface LegacyEndpointEvent {
  '@timestamp': number;
  endgame: {
    pid?: number;
    ppid?: number;
    event_type_full?: string;
    event_subtype_full?: string;
    event_timestamp?: number;
    event_type?: number;
    unique_pid: number;
    unique_ppid?: number;
    machine_id?: string;
    process_name?: string;
    process_path?: string;
    timestamp_utc?: string;
    serial_event_id?: number;
  };
  agent: {
    id: string;
    type: string;
    version: string;
  };
  process?: object;
  rule?: object;
  user?: object;
}

export interface EndpointEvent {
  '@timestamp': number;
  event: {
    category: string;
    type: string;
    id: string;
  };
  endpoint: {
    process: {
      entity_id: string;
      parent: {
        entity_id: string;
      };
    };
  };
  agent: {
    id: string;
    type: string;
  };
}

export type ResolverEvent = EndpointEvent | LegacyEndpointEvent;

/**
 * The PageId type is used for the payload when firing userNavigatedToPage actions
 */
export type PageId = 'alertsPage' | 'managementPage' | 'policyListPage';
