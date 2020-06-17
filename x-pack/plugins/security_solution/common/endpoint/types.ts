/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datasource, NewDatasource } from '../../../ingest_manager/common';

/**
 * Object that allows you to maintain stateful information in the location object across navigation events
 *
 */

export interface AppLocation {
  pathname: string;
  search: string;
  hash: string;
  key?: string;
  state?: {
    isTabChange?: boolean;
  };
}

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
type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export interface EventStats {
  /**
   * The total number of related events (all events except process and alerts) that exist for a node.
   */
  total: number;
  /**
   * A mapping of ECS event.category to the number of related events are marked with that category
   * For example:
   *  {
   *    network: 5,
   *    file: 2
   *  }
   */
  byCategory: Record<string, number>;
}

/**
 * Statistical information for a node in a resolver tree.
 */
export interface ResolverNodeStats {
  /**
   * The stats for related events (excludes alerts and process events) for a particular node in the resolver tree.
   */
  events: EventStats;
  /**
   * The total number of alerts that exist for a node.
   */
  totalAlerts: number;
}

/**
 * A child node can also have additional children so we need to provide a pagination cursor.
 */
export interface ChildNode extends LifecycleNode {
  /**
   * A child node's pagination cursor can be null for a couple reasons:
   * 1. At the time of querying it could have no children in ES, in which case it will be marked as
   *  null because we know it does not have children during this query.
   * 2. If the max level was reached we do not know if this node has children or not so we'll mark it as null
   */
  nextChild: string | null;
}

/**
 * The response structure for the children route. The structure is an array of nodes where each node
 * has an array of lifecycle events.
 */
export interface ResolverChildren {
  childNodes: ChildNode[];
  /**
   * This is the children cursor for the origin of a tree.
   */
  nextChild: string | null;
}

/**
 * A flattened tree representing the nodes in a resolver graph.
 */
export interface ResolverTree {
  /**
   * Origin of the tree. This is in the middle of the tree. Typically this would be the same
   * process node that generated an alert.
   */
  entityID: string;
  children: ResolverChildren;
  relatedEvents: Omit<ResolverRelatedEvents, 'entityID'>;
  ancestry: ResolverAncestry;
  lifecycle: ResolverEvent[];
  stats: ResolverNodeStats;
}

/**
 * The lifecycle events (start, end etc) for a node.
 */
export interface LifecycleNode {
  entityID: string;
  lifecycle: ResolverEvent[];
  /**
   * stats are only set when the entire tree is being fetched
   */
  stats?: ResolverNodeStats;
}

/**
 * The response structure when searching for ancestors of a node.
 */
export interface ResolverAncestry {
  /**
   * An array of ancestors with the lifecycle events grouped together
   */
  ancestors: LifecycleNode[];
  /**
   * A cursor for retrieving additional ancestors for a particular node. `null` indicates that there were no additional
   * ancestors when the request returned. More could have been ingested by ES after the fact though.
   */
  nextAncestor: string | null;
}

/**
 * Response structure for the related events route.
 */
export interface ResolverRelatedEvents {
  entityID: string;
  events: ResolverEvent[];
  nextEvent: string | null;
}

/**
 * Returned by the server via /api/endpoint/metadata
 */
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

/**
 * Operating System metadata for a host.
 */
export interface HostOS {
  full: string;
  name: string;
  version: string;
  variant: string;
}

/**
 * Host metadata. Describes an endpoint host.
 */
export interface Host {
  id: string;
  hostname: string;
  ip: string[];
  mac: string[];
  os: HostOS;
}

/**
 * A record of hashes for something. Provides hashes in multiple formats. A favorite structure of the Elastic Endpoint.
 */
interface Hashes {
  /**
   * A hash in MD5 format.
   */
  md5: string;
  /**
   * A hash in SHA-1 format.
   */
  sha1: string;
  /**
   * A hash in SHA-256 format.
   */
  sha256: string;
}

interface MalwareClassification {
  identifier: string;
  score: number;
  threshold: number;
  version: string;
}

interface ThreadFields {
  id: number;
  service_name: string;
  start: number;
  start_address: number;
  start_address_module: string;
}

interface DllFields {
  pe: {
    architecture: string;
    imphash: string;
  };
  code_signature: {
    subject_name: string;
    trusted: boolean;
  };
  compile_time: number;
  hash: Hashes;
  malware_classification: MalwareClassification;
  mapped_address: number;
  mapped_size: number;
  path: string;
}

/**
 * Describes an Alert Event.
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
      applied: {
        id: string;
        status: HostPolicyResponseActionStatus;
        name: string;
      };
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
    hash: Hashes;
    pe?: {
      imphash: string;
    };
    executable: string;
    sid?: string;
    start: number;
    malware_classification?: MalwareClassification;
    token: {
      domain: string;
      type: string;
      user: string;
      sid: string;
      integrity_level: number;
      integrity_level_name: string;
      privileges?: Array<{
        description: string;
        name: string;
        enabled: boolean;
      }>;
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
    hash: Hashes;
    pe?: {
      imphash: string;
    };
    code_signature: {
      trusted: boolean;
      subject_name: string;
    };
    malware_classification: MalwareClassification;
    temp_file_path: string;
  };
  host: Host;
  dll?: DllFields[];
}>;

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
      applied: {
        id: string;
        status: HostPolicyResponseActionStatus;
        name: string;
      };
    };
  };
  agent: {
    id: string;
    version: string;
  };
  host: Host;
}>;

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
  event?: {
    action?: string;
    type?: string;
    category?: string | string[];
  };
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
    os: HostOS;
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
export type KbnConfigSchemaInputTypeOf<T> = T extends Record<string, unknown>
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
 * The set of Policy configuration settings that are show/edited via the UI
 */
export interface UIPolicyConfig {
  /**
   * Windows-specific policy configuration that is supported via the UI
   */
  windows: Pick<PolicyConfig['windows'], 'events' | 'malware'>;
  /**
   * Mac-specific policy configuration that is supported via the UI
   */
  mac: Pick<PolicyConfig['mac'], 'malware' | 'events'>;
  /**
   * Linux-specific policy configuration that is supported via the UI
   */
  linux: Pick<PolicyConfig['linux'], 'events'>;
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

/**
 * the possible status for actions, configurations and overall Policy Response
 */
export enum HostPolicyResponseActionStatus {
  success = 'success',
  failure = 'failure',
  warning = 'warning',
}

/**
 * The name of actions that can be applied during the processing of a policy
 */
type HostPolicyActionName =
  | 'download_model'
  | 'ingest_events_config'
  | 'workflow'
  | 'configure_elasticsearch_connection'
  | 'configure_kernel'
  | 'configure_logging'
  | 'configure_malware'
  | 'connect_kernel'
  | 'detect_file_open_events'
  | 'detect_file_write_events'
  | 'detect_image_load_events'
  | 'detect_process_events'
  | 'download_global_artifacts'
  | 'load_config'
  | 'load_malware_model'
  | 'read_elasticsearch_config'
  | 'read_events_config'
  | 'read_kernel_config'
  | 'read_logging_config'
  | 'read_malware_config'
  | string;

/**
 * Host Policy Response Applied Action
 */
export interface HostPolicyResponseAppliedAction {
  name: HostPolicyActionName;
  status: HostPolicyResponseActionStatus;
  message: string;
}

export type HostPolicyResponseConfiguration = HostPolicyResponse['endpoint']['policy']['applied']['response']['configurations'];

interface HostPolicyResponseConfigurationStatus {
  status: HostPolicyResponseActionStatus;
  concerned_actions: HostPolicyActionName[];
}

/**
 * Host Policy Response Applied Artifact
 */
interface HostPolicyResponseAppliedArtifact {
  name: string;
  sha256: string;
}

/**
 * Information about the applying of a policy to a given host
 */
export interface HostPolicyResponse {
  '@timestamp': number;
  elastic: {
    agent: {
      id: string;
    };
  };
  ecs: {
    version: string;
  };
  host: {
    id: string;
  };
  event: {
    created: number;
    kind: string;
    id: string;
    category: string;
    type: string;
    module: string;
    action: string;
    dataset: string;
  };
  agent: {
    version: string;
    id: string;
  };
  endpoint: {
    policy: {
      applied: {
        version: string;
        id: string;
        name: string;
        status: HostPolicyResponseActionStatus;
        actions: HostPolicyResponseAppliedAction[];
        response: {
          configurations: {
            malware: HostPolicyResponseConfigurationStatus;
            events: HostPolicyResponseConfigurationStatus;
            logging: HostPolicyResponseConfigurationStatus;
            streaming: HostPolicyResponseConfigurationStatus;
          };
        };
        artifacts: {
          global: {
            version: string;
            identifiers: HostPolicyResponseAppliedArtifact[];
          };
          user: {
            version: string;
            identifiers: HostPolicyResponseAppliedArtifact[];
          };
        };
      };
    };
  };
}

/**
 * REST API response for retrieving a host's Policy Response status
 */
export interface GetHostPolicyResponse {
  policy_response: HostPolicyResponse;
}
