/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from 'kibana/public';
import { Agent, PackagePolicy, UpdatePackagePolicy } from '../../../../fleet/common';
import { ManifestSchema } from '../schema/manifest';

export * from './actions';
export * from './os';
export * from './trusted_apps';
export type { ConditionEntriesMap, ConditionEntry } from './exception_list_items';

/**
 * Supported React-Router state for the Policy Details page
 */
export interface PolicyDetailsRouteState {
  /**
   * Override the "back link" displayed at the top-left corner of page with custom routing
   */
  backLink?: {
    /** link label text */
    label: string;
    navigateTo: Parameters<ApplicationStart['navigateToApp']>;
    href?: string;
  };

  /**
   * Where the user should be redirected to when the `Save` button is clicked and the update was successful
   */
  onSaveNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
  /**
   * Where the user should be redirected to when the `Cancel` button is clicked
   */
  onCancelNavigateTo?: Parameters<ApplicationStart['navigateToApp']>;
}

/**
 * Object that allows you to maintain stateful information in the location object across navigation events
 *
 */
export interface AppLocation {
  pathname: string;
  search: string;
  hash: string;
  key?: string;
  state?:
    | {
        isTabChange?: boolean;
      }
    | PolicyDetailsRouteState;
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
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

/**
 * Utility type that will return back a union of the given [T]ype and an Immutable version of it
 */
export type MaybeImmutable<T> = T | Immutable<T>;

/**
 * Stats for related events for a particular node in a resolver graph.
 */
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
 * Represents the object structure of a returned document when using doc value fields to filter the fields
 * returned in a document from an Elasticsearch query.
 *
 * Here is an example:
 *
 * {
 *  "_index": ".ds-logs-endpoint.events.process-default-000001",
 *  "_id": "bc7brnUBxO0aE7QcCVHo",
 *  "_score": null,
 *  "fields": { <----------- The FieldsObject represents this portion
 *    "@timestamp": [
 *      "2020-11-09T21:13:25.246Z"
 *    ],
 *    "process.name": "explorer.exe",
 *    "process.parent.entity_id": [
 *      "0i17c2m22c"
 *    ],
 *    "process.Ext.ancestry": [ <------------ Notice that the keys are flattened
 *      "0i17c2m22c",
 *      "2z9j8dlx72",
 *      "oj61pr6g62",
 *      "x0leonbrc9"
 *    ],
 *    "process.entity_id": [
 *      "6k8waczi22"
 *    ]
 *  },
 *  "sort": [
 *    0,
 *    1604956405246
 *  ]
 * }
 */
export interface FieldsObject {
  [key: string]: ECSField<number | string>;
}

/**
 * A node in a resolver graph.
 */
export interface ResolverNode {
  data: FieldsObject;
  id: string | number;
  // the very root node might not have the parent field defined
  parent?: string | number;
  name?: string;
  stats: EventStats;
}

/**
 * The structure for a resolver graph that is generic and data type agnostic. The nodes in the graph do not conform
 * to a specific document type. The format of the nodes is defined by the schema used to query for the graph.
 */
export interface NewResolverTree {
  originID: string;
  nodes: ResolverNode[];
}

/**
 * Response structure for the related events route.
 *
 * @deprecated use {@link ResolverNode} instead
 */
export interface ResolverRelatedEvents {
  entityID: string;
  events: SafeResolverEvent[];
  nextEvent: string | null;
}

/**
 * Response structure for the events route.
 * `nextEvent` will be set to null when at the time of querying there were no more results to retrieve from ES.
 */
export interface ResolverPaginatedEvents {
  events: SafeResolverEvent[];
  nextEvent: string | null;
}

/**
 * Returned by the server via POST /api/endpoint/metadata
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
  /* policy IDs and versions */
  policy_info?: HostInfo['policy_info'];
}

/**
 * The data_stream fields in an elasticsearch document.
 */
export interface DataStream {
  dataset: string;
  namespace: string;
  type: string;
}

/**
 * Operating System metadata.
 */
export interface OSFields {
  full: string;
  name: string;
  version: string;
  platform: string;
  family: string;
  Ext: OSFieldsExt;
}

/**
 * Extended Operating System metadata.
 */
export interface OSFieldsExt {
  variant: string;
}

/**
 * Host metadata. Describes an endpoint host.
 */
export interface Host {
  id: string;
  hostname: string;
  name: string;
  ip: string[];
  mac: string[];
  architecture: string;
  os: OSFields;
}

/**
 * A record of hashes for something. Provides hashes in multiple formats. A favorite structure of the Elastic Endpoint.
 */
type Hashes = Partial<{
  /**
   * A hash in MD5 format.
   */
  md5: ECSField<string>;
  /**
   * A hash in SHA-1 format.
   */
  sha1: ECSField<string>;
  /**
   * A hash in SHA-256 format.
   */
  sha256: ECSField<string>;
}>;

type MalwareClassification = Partial<{
  identifier: ECSField<string>;
  score: ECSField<number>;
  threshold: ECSField<number>;
  version: ECSField<string>;
}>;

type ThreadFields = Partial<{
  id: ECSField<number>;
  Ext: Partial<{
    service_name: ECSField<string>;
    start: ECSField<number>;
    start_address: ECSField<number>;
    start_address_module: ECSField<string>;
  }>;
}>;

type DllFields = Partial<{
  hash: Hashes;
  path: ECSField<string>;
  pe: Partial<{
    architecture: ECSField<string>;
  }>;
  code_signature: Partial<{
    subject_name: ECSField<string>;
    trusted: ECSField<boolean>;
  }>;
  Ext: Partial<{
    compile_time: ECSField<number>;
    malware_classification: MalwareClassification;
    mapped_address: ECSField<number>;
    mapped_size: ECSField<number>;
  }>;
}>;

/**
 * Describes an Alert Event.
 */
export type AlertEvent = Partial<{
  event: Partial<{
    action: ECSField<string>;
    code: ECSField<string>;
    dataset: ECSField<string>;
    module: ECSField<string>;
  }>;
  Endpoint: Partial<{
    policy: Partial<{
      applied: Partial<{
        id: ECSField<string>;
        status: ECSField<HostPolicyResponseActionStatus>;
        name: ECSField<string>;
      }>;
    }>;
  }>;
  // disabling naming-convention to accommodate external field
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Memory_protection: Partial<{
    feature: ECSField<string>;
    self_injection: ECSField<boolean>;
  }>;
  destination: Partial<{
    port: ECSField<number>;
    ip: ECSField<string>;
  }>;
  source: Partial<{
    port: ECSField<number>;
    ip: ECSField<string>;
  }>;
  registry: Partial<{
    path: ECSField<string>;
    value: ECSField<string>;
    data: Partial<{
      strings: ECSField<string>;
    }>;
  }>;
  Target: Partial<{
    process: Partial<{
      thread: Partial<{
        Ext: Partial<{
          start_address_allocation_offset: ECSField<number>;
          start_address_bytes_disasm_hash: ECSField<string>;
          start_address_details: Partial<{
            allocation_type: ECSField<string>;
            allocation_size: ECSField<number>;
            region_size: ECSField<number>;
            region_protection: ECSField<string>;
            memory_pe: Partial<{
              imphash: ECSField<string>;
            }>;
          }>;
        }>;
      }>;
    }>;
  }>;
  process: Partial<{
    command_line: ECSField<string>;
    ppid: ECSField<number>;
    start: ECSField<number>;
    // Using ECSField as the outer because the object is expected to be an array
    thread: ECSField<ThreadFields>;
    uptime: ECSField<number>;
    Ext: Partial<{
      // Using ECSField as the outer because the object is expected to be an array
      code_signature: ECSField<
        Partial<{
          subject_name: ECSField<string>;
          trusted: ECSField<boolean>;
        }>
      >;
      malware_classification: MalwareClassification;
      token: Partial<{
        domain: ECSField<string>;
        type: ECSField<string>;
        user: ECSField<string>;
        sid: ECSField<string>;
        integrity_level: ECSField<number>;
        integrity_level_name: ECSField<string>;
        // Using ECSField as the outer because the object is expected to be an array
        privileges: ECSField<
          Partial<{
            description: ECSField<string>;
            name: ECSField<string>;
            enabled: ECSField<boolean>;
          }>
        >;
      }>;
      user: ECSField<string>;
      malware_signature: Partial<{
        all_names: ECSField<string>;
        identifier: ECSField<string>;
      }>;
    }>;
  }>;
  rule: Partial<{
    id: ECSField<string>;
    description: ECSField<string>;
  }>;
  file: Partial<{
    owner: ECSField<string>;
    name: ECSField<string>;
    accessed: ECSField<number>;
    mtime: ECSField<number>;
    created: ECSField<number>;
    size: ECSField<number>;
    hash: Hashes;
    Ext: Partial<{
      malware_classification: MalwareClassification;
      temp_file_path: ECSField<string>;
      // Using ECSField as the outer because the object is expected to be an array
      code_signature: ECSField<
        Partial<{
          trusted: ECSField<boolean>;
          subject_name: ECSField<string>;
        }>
      >;
    }>;
  }>;
  // Using ECSField as the outer because the object is expected to be an array
  dll: ECSField<DllFields>;
}> &
  SafeEndpointEvent;

/**
 * The status of the Endpoint Agent as reported by the Agent or the
 * Security Solution app using events from Fleet.
 */
export enum EndpointStatus {
  /**
   * Agent is enrolled with Fleet
   */
  enrolled = 'enrolled',

  /**
   * Agent is unenrrolled from Fleet
   */
  unenrolled = 'unenrolled',
}

/**
 * The status of the host, which is mapped to the Elastic Agent status in Fleet
 */
export enum HostStatus {
  /**
   * Default state of the host when no host information is present or host information cannot
   * be retrieved. e.g. API error
   */
  UNHEALTHY = 'unhealthy',

  /**
   * Host is online as indicated by its checkin status during the last checkin window
   */
  HEALTHY = 'healthy',

  /**
   * Host is offline as indicated by its checkin status during the last checkin window
   */
  OFFLINE = 'offline',

  /**
   * Host is unenrolling, enrolling or updating as indicated by its checkin status during the last checkin window
   */
  UPDATING = 'updating',

  /**
   * Host is inactive as indicated by its checkin status during the last checkin window
   */
  INACTIVE = 'inactive',

  /**
   * Host is unenrolled
   */
  UNENROLLED = 'unenrolled',
}

export type PolicyInfo = Immutable<{
  revision: number;
  id: string;
}>;

export type HostInfo = Immutable<{
  metadata: HostMetadata;
  host_status: HostStatus;
  policy_info?: {
    agent: {
      /**
       * As set in Kibana
       */
      configured: PolicyInfo;
      /**
       * Last reported running in agent (may lag behind configured)
       */
      applied: PolicyInfo;
    };
    /**
     * Current intended 'endpoint' package policy
     */
    endpoint: PolicyInfo;
  };
}>;

// HostMetadataDetails is now just HostMetadata
// HostDetails is also just HostMetadata
export type HostMetadata = Immutable<{
  '@timestamp': number;
  event: {
    created: number;
    kind: string;
    id: string;
    category: string[];
    type: string[];
    module: string;
    action: string;
    dataset: string;
  };
  elastic: {
    agent: {
      id: string;
    };
  };
  Endpoint: {
    status: EndpointStatus;
    policy: {
      applied: {
        id: string;
        status: HostPolicyResponseActionStatus;
        name: string;
        /** The endpoint integration policy revision number in kibana */
        endpoint_policy_version: number;
        version: number;
      };
    };
    configuration?: {
      /**
       * Shows whether the endpoint is set up to be isolated. (e.g. a user has isolated a host,
       * and the endpoint successfully received that action and applied the setting)
       */
      isolation?: boolean;
    };
    state?: {
      /**
       * Shows what the current state of the host is. This could differ from `Endpoint.configuration.isolation`
       * in some cases, but normally they will match
       */
      isolation?: boolean;
    };
    capabilities?: string[];
  };
  agent: {
    id: string;
    version: string;
  };
  host: Host;
  data_stream: DataStream;
}>;

export type UnitedAgentMetadata = Immutable<{
  agent: {
    id: string;
  };
  united: {
    endpoint: HostMetadata;
    agent: Agent;
  };
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
  // A legacy has `endgame` and an `EndpointEvent` (AKA ECS event) will never have it. This helps TS narrow `SafeResolverEvent`.
  endgame?: never;
  event: {
    category: string | string[];
    type: string | string[];
    id: string;
    kind: string;
    sequence: number;
  };
  host: Host;
  network?: {
    direction: unknown;
    forwarded_ip: unknown;
  };
  dns?: {
    question: { name: unknown };
  };
  process: {
    entity_id: string;
    name: string;
    executable?: string;
    args?: string;
    code_signature?: {
      status?: string;
      subject_name: string;
    };
    pid?: number;
    hash?: {
      md5: string;
    };
    parent?: {
      entity_id: string;
      name?: string;
      pid?: number;
    };
    /*
     * The array has a special format. The entity_ids towards the beginning of the array are closer ancestors and the
     * values towards the end of the array are more distant ancestors (grandparents). Therefore
     * ancestry_array[0] == process.parent.entity_id and ancestry_array[1] == process.parent.parent.entity_id
     */
    Ext?: {
      ancestry?: string[];
    };
  };
  user?: {
    domain?: string;
    name: string;
  };
  file?: { path: unknown };
  registry?: { path: unknown; key: unknown };
}

export type ResolverEvent = EndpointEvent | LegacyEndpointEvent;

/**
 * All mappings in Elasticsearch support arrays. They can also return null values or be missing. For example, a `keyword` mapping could return `null` or `[null]` or `[]` or `'hi'`, or `['hi', 'there']`. We need to handle these cases in order to avoid throwing an error.
 * When dealing with an value that comes from ES, wrap the underlying type in `ECSField`. For example, if you have a `keyword` or `text` value coming from ES, cast it to `ECSField<string>`.
 */
export type ECSField<T> = T | null | undefined | Array<T | null>;

/**
 * A more conservative version of `ResolverEvent` that treats fields as optional and use `ECSField` to type all ECS fields.
 * Prefer this over `ResolverEvent`.
 */
export type SafeResolverEvent = SafeEndpointEvent | SafeLegacyEndpointEvent | WinlogEvent;

/**
 * A type for describing a winlog event until we can leverage runtime fields.
 */
export type WinlogEvent = Partial<{
  winlog: Partial<{
    record_id: ECSField<string>;
  }>;
}> &
  SafeEndpointEvent;

/**
 * Safer version of ResolverEvent. Please use this going forward.
 */
export type SafeEndpointEvent = Partial<{
  '@timestamp': ECSField<number>;
  agent: Partial<{
    id: ECSField<string>;
    version: ECSField<string>;
    type: ECSField<string>;
  }>;
  data_stream: Partial<{
    type: ECSField<string>;
    dataset: ECSField<string>;
    namespace: ECSField<string>;
  }>;
  ecs: Partial<{
    version: ECSField<string>;
  }>;
  event: Partial<{
    category: ECSField<string>;
    type: ECSField<string>;
    id: ECSField<string>;
    kind: ECSField<string>;
    sequence: ECSField<number>;
  }>;
  host: Partial<{
    id: ECSField<string>;
    hostname: ECSField<string>;
    name: ECSField<string>;
    ip: ECSField<string>;
    mac: ECSField<string>;
    architecture: ECSField<string>;
    os: Partial<{
      full: ECSField<string>;
      name: ECSField<string>;
      version: ECSField<string>;
      platform: ECSField<string>;
      family: ECSField<string>;
      Ext: Partial<{
        variant: ECSField<string>;
      }>;
    }>;
  }>;
  network: Partial<{
    transport: ECSField<string>;
    type: ECSField<string>;
    direction: ECSField<string>;
    forwarded_ip: ECSField<string>;
  }>;
  dns: Partial<{
    question: Partial<{
      name: ECSField<string>;
      type: ECSField<string>;
    }>;
  }>;
  process: Partial<{
    entity_id: ECSField<string>;
    name: ECSField<string>;
    executable: ECSField<string>;
    args: ECSField<string>;
    code_signature: Partial<{
      status: ECSField<string>;
      subject_name: ECSField<string>;
    }>;
    pid: ECSField<number>;
    hash: Hashes;
    working_directory: ECSField<string>;
    parent: Partial<{
      entity_id: ECSField<string>;
      name: ECSField<string>;
      pid: ECSField<number>;
    }>;
    session_leader: Partial<{
      entity_id: ECSField<string>;
      name: ECSField<string>;
      pid: ECSField<number>;
    }>;
    entry_leader: Partial<{
      entity_id: ECSField<string>;
      name: ECSField<string>;
      pid: ECSField<number>;
    }>;
    group_leader: Partial<{
      entity_id: ECSField<string>;
      name: ECSField<string>;
      pid: ECSField<number>;
    }>;
    /*
     * The array has a special format. The entity_ids towards the beginning of the array are closer ancestors and the
     * values towards the end of the array are more distant ancestors (grandparents). Therefore
     * ancestry_array[0] == process.parent.entity_id and ancestry_array[1] == process.parent.parent.entity_id
     */
    Ext: Partial<{
      ancestry: ECSField<string>;
    }>;
  }>;
  user: Partial<{
    domain: ECSField<string>;
    name: ECSField<string>;
  }>;
  file: Partial<{ path: ECSField<string> }>;
  registry: Partial<{ path: ECSField<string>; key: ECSField<string> }>;
}>;

export interface SafeLegacyEndpointEvent {
  '@timestamp'?: ECSField<number>;
  /**
   * 'legacy' events must have an `endgame` key.
   */
  endgame: Partial<{
    pid: ECSField<number>;
    ppid: ECSField<number>;
    event_type_full: ECSField<string>;
    event_subtype_full: ECSField<string>;
    event_timestamp: ECSField<number>;
    event_type: ECSField<number>;
    unique_pid: ECSField<number>;
    unique_ppid: ECSField<number>;
    machine_id: ECSField<string>;
    process_name: ECSField<string>;
    process_path: ECSField<string>;
    timestamp_utc: ECSField<string>;
    serial_event_id: ECSField<number>;
  }>;
  agent: Partial<{
    id: ECSField<string>;
    type: ECSField<string>;
    version: ECSField<string>;
  }>;
  event: Partial<{
    action: ECSField<string>;
    type: ECSField<string>;
    category: ECSField<string>;
    id: ECSField<string>;
  }>;
}

/**
 * The fields to use to identify nodes within a resolver tree.
 */
export interface ResolverSchema {
  /**
   * the ancestry field should be set to a field that contains an order array representing
   * the ancestors of a node.
   */
  ancestry?: string;
  /**
   * id represents the field to use as the unique ID for a node.
   */
  id: string;
  /**
   * field to use for the name of the node
   */
  name?: string;
  /**
   * parent represents the field that is the edge between two nodes.
   */
  parent: string;
}

/**
 * The response body for the resolver '/entity' index API
 */
export type ResolverEntityIndex = Array<{
  /**
   * A name for the schema that is being used (e.g. endpoint, winlogbeat, etc)
   */
  name: string;
  /**
   * The schema to pass to the /tree api and other backend requests, based on the contents of the document found using
   * the _id
   */
  schema: ResolverSchema;
  /**
   * Unique ID value for the requested document using the `_id` field passed to the /entity route
   */
  id: string;
}>;

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
  ? KbnConfigSchemaInputObjectTypeOf<T> /** `schema.number()` accepts strings, so this type should accept them as well. */
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
} & { [K in keyof KbnConfigSchemaNonOptionalProps<P>]: KbnConfigSchemaInputTypeOf<P[K]> };

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
    advanced?: {};
    events: {
      dll_and_driver_load: boolean;
      dns: boolean;
      file: boolean;
      network: boolean;
      process: boolean;
      registry: boolean;
      security: boolean;
    };
    malware: ProtectionFields & BlocklistFields;
    memory_protection: ProtectionFields & SupportedFields;
    behavior_protection: ProtectionFields & SupportedFields;
    ransomware: ProtectionFields & SupportedFields;
    logging: {
      file: string;
    };
    popup: {
      malware: {
        message: string;
        enabled: boolean;
      };
      ransomware: {
        message: string;
        enabled: boolean;
      };
      memory_protection: {
        message: string;
        enabled: boolean;
      };
      behavior_protection: {
        message: string;
        enabled: boolean;
      };
    };
    antivirus_registration: {
      enabled: boolean;
    };
  };
  mac: {
    advanced?: {};
    events: {
      file: boolean;
      process: boolean;
      network: boolean;
    };
    malware: ProtectionFields & BlocklistFields;
    behavior_protection: ProtectionFields & SupportedFields;
    memory_protection: ProtectionFields & SupportedFields;
    popup: {
      malware: {
        message: string;
        enabled: boolean;
      };
      behavior_protection: {
        message: string;
        enabled: boolean;
      };
      memory_protection: {
        message: string;
        enabled: boolean;
      };
    };
    logging: {
      file: string;
    };
  };
  linux: {
    advanced?: {};
    events: {
      file: boolean;
      process: boolean;
      network: boolean;
    };
    malware: ProtectionFields & BlocklistFields;
    behavior_protection: ProtectionFields & SupportedFields;
    memory_protection: ProtectionFields & SupportedFields;
    popup: {
      malware: {
        message: string;
        enabled: boolean;
      };
      behavior_protection: {
        message: string;
        enabled: boolean;
      };
      memory_protection: {
        message: string;
        enabled: boolean;
      };
    };
    logging: {
      file: string;
    };
  };
}

/**
 * The set of Policy configuration settings that are show/edited via the UI
 */
export interface UIPolicyConfig {
  /**
   * Windows-specific policy configuration that is supported via the UI
   */
  windows: Pick<
    PolicyConfig['windows'],
    | 'events'
    | 'malware'
    | 'ransomware'
    | 'popup'
    | 'antivirus_registration'
    | 'advanced'
    | 'memory_protection'
    | 'behavior_protection'
  >;
  /**
   * Mac-specific policy configuration that is supported via the UI
   */
  mac: Pick<
    PolicyConfig['mac'],
    'malware' | 'events' | 'popup' | 'advanced' | 'behavior_protection' | 'memory_protection'
  >;
  /**
   * Linux-specific policy configuration that is supported via the UI
   */
  linux: Pick<
    PolicyConfig['linux'],
    'malware' | 'events' | 'popup' | 'advanced' | 'behavior_protection' | 'memory_protection'
  >;
}

/** Policy:  Protection fields */
export interface ProtectionFields {
  mode: ProtectionModes;
}

/** Policy:  Supported fields */
export interface SupportedFields {
  supported: boolean;
}

export interface BlocklistFields {
  blocklist: boolean;
}

/** Policy protection mode options */
export enum ProtectionModes {
  detect = 'detect',
  prevent = 'prevent',
  off = 'off',
}

/**
 * Endpoint Policy data, which extends Ingest's `PackagePolicy` type
 */
export type PolicyData = PackagePolicy & NewPolicyData;

/**
 * New policy data. Used when updating the policy record via ingest APIs
 */
export type NewPolicyData = UpdatePackagePolicy & {
  inputs: [
    {
      type: 'endpoint';
      enabled: boolean;
      streams: [];
      config: {
        artifact_manifest: {
          value: ManifestSchema;
        };
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
  unsupported = 'unsupported',
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

export type HostPolicyResponseConfiguration =
  HostPolicyResponse['Endpoint']['policy']['applied']['response']['configurations'];

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
  data_stream: DataStream;
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
    category: string[];
    type: string[];
    module: string;
    action: string;
    dataset: string;
  };
  agent: {
    version: string;
    id: string;
  };
  Endpoint: {
    policy: {
      applied: {
        version: number;
        endpoint_policy_version: number;
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

/**
 * REST API response for retrieving agent summary
 */
export interface GetAgentSummaryResponse {
  summary_response: {
    package: string;
    policy_id?: string;
    versions_count: { [key: string]: number };
  };
}

/**
 * REST API response for retrieving exception summary
 */
export interface GetExceptionSummaryResponse {
  total: number;
  windows: number;
  macos: number;
  linux: number;
}

/**
 * Supported React-Router state for the Generic List page
 */
export interface ListPageRouteState {
  /** Where the user should be redirected to when the `Back` button is clicked */
  onBackButtonNavigateTo: Parameters<ApplicationStart['navigateToApp']>;
  /** The URL for the `Back` button */
  backButtonUrl?: string;
  /** The label for the button */
  backButtonLabel?: string;
}

/**
 * REST API standard base response for list types
 */
interface BaseListResponse<D = unknown> {
  data: D[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdditionalOnSwitchChangeParams {
  value: boolean;
  policyConfigData: UIPolicyConfig;
  protectionOsList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
}

/**
 * Returned by the server via GET /api/endpoint/metadata
 */
export type MetadataListResponse = BaseListResponse<HostInfo>;

export type { EndpointPrivileges } from './authz';
