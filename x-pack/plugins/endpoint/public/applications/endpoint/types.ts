/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { IIndexPattern } from 'src/plugins/data/public';
import {
  HostMetadata,
  AlertData,
  AlertResultList,
  Immutable,
  ImmutableArray,
  AlertDetails,
} from '../../../common/types';
import { EndpointPluginStartDependencies } from '../../plugin';
import { AppAction } from './store/action';
import { CoreStart } from '../../../../../../src/core/public';
import { Datasource, NewDatasource } from '../../../../ingest_manager/common/types/models';
import { GetAgentStatusResponse } from '../../../../ingest_manager/common/types/rest_spec';

export { AppAction };
export type MiddlewareFactory<S = GlobalState> = (
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, S>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export interface HostListState {
  hosts: HostMetadata[];
  pageSize: number;
  pageIndex: number;
  total: number;
  loading: boolean;
  detailsError?: ServerApiError;
  details?: Immutable<HostMetadata>;
  location?: Immutable<EndpointAppLocation>;
}

export interface HostListPagination {
  pageIndex: number;
  pageSize: number;
}
export interface HostIndexUIQueryParams {
  selected_host?: string;
}

export interface ServerApiError {
  statusCode: number;
  error: string;
  message: string;
}

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
 * Endpoint Policy data, which extends Ingest's `Datasource` type
 */
export type PolicyData = Datasource & NewPolicyData;

/**
 * Policy list store state
 */
export interface PolicyListState {
  /** Array of policy items  */
  policyItems: PolicyData[];
  /** API error if loading data failed */
  apiError?: ServerApiError;
  /** total number of policies */
  total: number;
  /** Number of policies per page */
  pageSize: number;
  /** page number (zero based) */
  pageIndex: number;
  /** data is being retrieved from server */
  isLoading: boolean;
}

/**
 * Policy details store state
 */
export interface PolicyDetailsState {
  /** A single policy item  */
  policyItem?: PolicyData;
  /** API error if loading data failed */
  apiError?: ServerApiError;
  isLoading: boolean;
  /** current location of the application */
  location?: Immutable<EndpointAppLocation>;
  /** A summary of stats for the agents associated with a given Fleet Agent Configuration */
  agentStatusSummary: GetAgentStatusResponse['results'];
  /** Status of an update to the policy  */
  updateStatus?: {
    success: boolean;
    error?: ServerApiError;
  };
}

/**
 * Endpoint Policy configuration
 */
export interface PolicyConfig {
  windows: {
    events: {
      process: boolean;
      network: boolean;
    };
    /** malware mode can be off, detect, prevent or prevent and notify user */
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
export type nerds<t extends keyof UIPolicyConfig> = keyof UIPolicyConfig[t]['events'];

/** OS used in Policy */
export enum OS {
  windows = 'windows',
  mac = 'mac',
  linux = 'linux',
}

/** Used in Policy */
export enum EventingFields {
  process = 'process',
  network = 'network',
  file = 'file',
}

/**
 * Returns the keys of an object whose values meet a criteria.
 *  Ex) interface largeNestedObject = {
 *         a: {
 *           food: Foods;
 *           toiletPaper: true;
 *         };
 *         b: {
 *           food: Foods;
 *           streamingServices: Streams;
 *         };
 *         c: {};
 *    }
 *
 *    type hasFoods = KeysByValueCriteria<largeNestedObject, { food: Foods }>;
 *    The above type will be: [a, b] only, and will not include c.
 *
 */
export type KeysByValueCriteria<O, Criteria> = {
  [K in keyof O]: O[K] extends Criteria ? K : never;
}[keyof O];

/** Returns an array of the policy OSes that have a malware protection field */

export type MalwareProtectionOSes = KeysByValueCriteria<UIPolicyConfig, { malware: MalwareFields }>;
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

export interface GlobalState {
  readonly hostList: HostListState;
  readonly alertList: AlertListState;
  readonly policyList: PolicyListState;
  readonly policyDetails: PolicyDetailsState;
}

/**
 * A better type for createStructuredSelector. This doesn't support the options object.
 */
export type CreateStructuredSelector = <
  SelectorMap extends { [key: string]: (...args: never[]) => unknown }
>(
  selectorMap: SelectorMap
) => (
  state: SelectorMap[keyof SelectorMap] extends (state: infer State) => unknown ? State : never
) => {
  [Key in keyof SelectorMap]: ReturnType<SelectorMap[Key]>;
};

export interface EndpointAppLocation {
  pathname: string;
  search: string;
  hash: string;
  key?: string;
}

interface AlertsSearchBarState {
  patterns: IIndexPattern[];
}

export type AlertListData = AlertResultList;

export interface AlertListState {
  /** Array of alert items. */
  readonly alerts: ImmutableArray<AlertData>;

  /** The total number of alerts on the page. */
  readonly total: number;

  /** Number of alerts per page. */
  readonly pageSize: number;

  /** Page number, starting at 0. */
  readonly pageIndex: number;

  /** Current location object from React Router history. */
  readonly location?: Immutable<EndpointAppLocation>;

  /** Specific Alert data to be shown in the details view */
  readonly alertDetails?: Immutable<AlertDetails>;

  /** Search bar state including indexPatterns */
  readonly searchBar: AlertsSearchBarState;
}

/**
 * Gotten by parsing the URL from the browser. Used to calculate the new URL when changing views.
 */
export interface AlertingIndexUIQueryParams {
  /**
   * How many items to show in list.
   */
  page_size?: string;
  /**
   * Which page to show. If `page_index` is 1, show page 2.
   */
  page_index?: string;
  /**
   * If any value is present, show the alert detail view for the selected alert. Should be an ID for an alert event.
   */
  selected_alert?: string;
  query?: string;
  date_range?: string;
  filters?: string;
}
