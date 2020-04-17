/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { TypeOf } from '@kbn/config-schema';
import { alertingIndexGetQuerySchema } from './schema/alert_index';
import { indexPatternGetParamsSchema } from './schema/index_pattern';
import { Datasource, NewDatasource } from '../../ingest_manager/common';

/**
 * A deep readonly type that will make all children of a given object readonly recursively
 */
export type Immutable<T> = T extends undefined | null | boolean | string | number
  ? T
  : unknown extends T
  ? unknown
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

export type Direction = 'asc' | 'desc';

export class EndpointAppConstants {
  static BASE_API_URL = '/api/endpoint';
  static INDEX_PATTERN_ROUTE = `${EndpointAppConstants.BASE_API_URL}/index_pattern`;
  static ALERT_INDEX_NAME = 'events-endpoint-1';
  static EVENT_DATASET = 'events';
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
  static MAX_LONG_INT = '9223372036854775807'; // 2^63-1
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

export interface HostResultList {
  /* the hosts restricted by the page size */
  hosts: HostInfo[];
  /* the total number of unique hosts in the index */
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
export interface MalwareClassificationFields {
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
  malware_classification: MalwareClassificationFields;
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
  endpoint: {
    policy: {
      id: string;
    };
  };
  process: {
    code_signature: {
      subject_name: string;
      trusted: boolean;
    };
    command_line?: string;
    domain?: string;
    pid: number;
    ppid?: number;
    entity_id: string;
    parent?: {
      pid: number;
      entity_id: string;
    };
    name: string;
    hash: HashFields;
    pe?: {
      imphash: string;
    };
    executable: string;
    sid?: string;
    start: number;
    malware_classification?: MalwareClassificationFields;
    token: {
      domain: string;
      type: string;
      user: string;
      sid: string;
      integrity_level: number;
      integrity_level_name: string;
      privileges?: PrivilegesFields[];
    };
    thread?: ThreadFields[];
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
    pe?: {
      imphash: string;
    };
    code_signature: {
      trusted: boolean;
      subject_name: string;
    };
    malware_classification: MalwareClassificationFields;
    temp_file_path: string;
  };
  host: HostFields;
  dll?: DllFields[];
}>;

interface AlertMetadata {
  id: string;

  // Alert Details Pagination
  next: string | null;
  prev: string | null;
}

interface AlertState {
  state: {
    host_metadata: HostMetadata;
  };
}

/**
 * Union of alert data and metadata.
 */
export type AlertData = AlertEvent & AlertMetadata;

export type AlertDetails = AlertData & AlertState;

/**
 * The status of the host
 */
export enum HostStatus {
  /**
   * Default state of the host when no host information is present or host information cannot
   * be retrieved. e.g. API error
   */
  ERROR = 'error',

  /**
   * Host is online as indicated by its checkin status during the last checkin window
   */
  ONLINE = 'online',

  /**
   * Host is offline as indicated by its checkin status during the last checkin window
   */
  OFFLINE = 'offline',
}

export type HostInfo = Immutable<{
  metadata: HostMetadata;
  host_status: HostStatus;
}>;

export type HostMetadata = Immutable<{
  '@timestamp': number;
  event: {
    created: number;
  };
  elastic: {
    agent: {
      id: string;
    };
  };
  endpoint: {
    policy: {
      id: string;
    };
  };
  agent: {
    id: string;
    version: string;
  };
  host: HostFields;
}>;

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
  agent: {
    id: string;
    version: string;
    type: string;
  };
  ecs: {
    version: string;
  };
  event: {
    category: string | string[];
    type: string | string[];
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
    name: string;
    parent?: {
      entity_id: string;
      name?: string;
    };
  };
}

export type ResolverEvent = EndpointEvent | LegacyEndpointEvent;

/**
 * Takes a @kbn/config-schema 'schema' type and returns a type that represents valid inputs.
 * Similar to `TypeOf`, but allows strings as input for `schema.number()` (which is inline
 * with the behavior of the validator.) Also, for `schema.object`, when a value is a `schema.maybe`
 * the key will be marked optional (via `?`) so that you can omit keys for optional values.
 *
 * Use this when creating a value that will be passed to the schema.
 * e.g.
 * ```ts
 * const input: KbnConfigSchemaInputTypeOf<typeof schema> = value
 * schema.validate(input) // should be valid
 * ```
 * Note that because the types coming from `@kbn/config-schema`'s schemas sometimes have deeply nested
 * `Type` types, we process the result of `TypeOf` instead, as this will be consistent.
 */
type KbnConfigSchemaInputTypeOf<T> = T extends Record<string, unknown>
  ? KbnConfigSchemaInputObjectTypeOf<
      T
    > /** `schema.number()` accepts strings, so this type should accept them as well. */
  : number extends T
  ? T | string
  : T;

/**
 * Works like ObjectResultType, except that 'maybe' schema will create an optional key.
 * This allows us to avoid passing 'maybeKey: undefined' when constructing such an object.
 *
 * Instead of using this directly, use `InputTypeOf`.
 */
type KbnConfigSchemaInputObjectTypeOf<P extends Record<string, unknown>> = {
  /** Use ? to make the field optional if the prop accepts undefined.
   * This allows us to avoid writing `field: undefined` for optional fields.
   */
  [K in Exclude<keyof P, keyof KbnConfigSchemaNonOptionalProps<P>>]?: KbnConfigSchemaInputTypeOf<
    P[K]
  >;
} &
  { [K in keyof KbnConfigSchemaNonOptionalProps<P>]: KbnConfigSchemaInputTypeOf<P[K]> };

/**
 * Takes the props of a schema.object type, and returns a version that excludes
 * optional values. Used by `InputObjectTypeOf`.
 *
 * Instead of using this directly, use `InputTypeOf`.
 */
type KbnConfigSchemaNonOptionalProps<Props extends Record<string, unknown>> = Pick<
  Props,
  {
    [Key in keyof Props]: undefined extends Props[Key]
      ? never
      : null extends Props[Key]
      ? never
      : Key;
  }[keyof Props]
>;

/**
 * Query params to pass to the alert API when fetching new data.
 */
export type AlertingIndexGetQueryInput = KbnConfigSchemaInputTypeOf<
  TypeOf<typeof alertingIndexGetQuerySchema>
>;

/**
 * Result of the validated query params when handling alert index requests.
 */
export type AlertingIndexGetQueryResult = TypeOf<typeof alertingIndexGetQuerySchema>;

/**
 * Result of the validated params when handling an index pattern request.
 */
export type IndexPatternGetParamsResult = TypeOf<typeof indexPatternGetParamsSchema>;

/**
 * Endpoint Policy configuration
 */
export interface PolicyConfig {
  windows: {
    events: {
      dll_and_driver_load: boolean;
      dns: boolean;
      file: boolean;
      network: boolean;
      process: boolean;
      registry: boolean;
      security: boolean;
    };
    malware: MalwareFields;
    logging: {
      stdout: string;
      file: string;
    };
    advanced: PolicyConfigAdvancedOptions;
  };
  mac: {
    events: {
      file: boolean;
      process: boolean;
      network: boolean;
    };
    malware: MalwareFields;
    logging: {
      stdout: string;
      file: string;
    };
    advanced: PolicyConfigAdvancedOptions;
  };
  linux: {
    events: {
      file: boolean;
      process: boolean;
      network: boolean;
    };
    logging: {
      stdout: string;
      file: string;
    };
    advanced: PolicyConfigAdvancedOptions;
  };
}

/**
 * Windows-specific policy configuration that is supported via the UI
 */
type WindowsPolicyConfig = Pick<PolicyConfig['windows'], 'events' | 'malware'>;

/**
 * Mac-specific policy configuration that is supported via the UI
 */
type MacPolicyConfig = Pick<PolicyConfig['mac'], 'malware' | 'events'>;

/**
 * Linux-specific policy configuration that is supported via the UI
 */
type LinuxPolicyConfig = Pick<PolicyConfig['linux'], 'events'>;

/**
 * The set of Policy configuration settings that are show/edited via the UI
 */
export interface UIPolicyConfig {
  windows: WindowsPolicyConfig;
  mac: MacPolicyConfig;
  linux: LinuxPolicyConfig;
}

interface PolicyConfigAdvancedOptions {
  elasticsearch: {
    indices: {
      control: string;
      event: string;
      logging: string;
    };
    kernel: {
      connect: boolean;
      process: boolean;
    };
  };
}

/** Policy: Malware protection fields */
export interface MalwareFields {
  mode: ProtectionModes;
}

/** Policy protection mode options */
export enum ProtectionModes {
  detect = 'detect',
  prevent = 'prevent',
  preventNotify = 'preventNotify',
  off = 'off',
}

/**
 * Endpoint Policy data, which extends Ingest's `Datasource` type
 */
export type PolicyData = Datasource & NewPolicyData;

/**
 * New policy data. Used when updating the policy record via ingest APIs
 */
export type NewPolicyData = NewDatasource & {
  inputs: [
    {
      type: 'endpoint';
      enabled: boolean;
      streams: [];
      config: {
        policy: {
          value: PolicyConfig;
        };
      };
    }
  ];
};
