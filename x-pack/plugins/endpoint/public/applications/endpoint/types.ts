/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Dispatch,
  Action as ReduxAction,
  AnyAction as ReduxAnyAction,
  Action,
  Middleware,
} from 'redux';
import { IIndexPattern } from 'src/plugins/data/public';
import {
  HostMetadata,
  AlertData,
  AlertResultList,
  Immutable,
  AlertDetails,
  MalwareFields,
  UIPolicyConfig,
  PolicyData,
  HostPolicyResponse,
  HostInfo,
} from '../../../common/types';
import { EndpointPluginStartDependencies } from '../../plugin';
import { AppAction } from './store/action';
import { CoreStart } from '../../../../../../src/core/public';
import {
  GetAgentStatusResponse,
  GetDatasourcesResponse,
  GetOneDatasourceResponse,
  UpdateDatasourceResponse,
} from '../../../../ingest_manager/common';

export { AppAction };

/**
 * like redux's `MiddlewareAPI` but `getState` returns an `Immutable` version of
 * state and `dispatch` accepts `Immutable` versions of actions.
 */
export interface ImmutableMiddlewareAPI<S, A extends Action> {
  dispatch: Dispatch<A | Immutable<A>>;
  getState(): Immutable<S>;
}

/**
 * Like redux's `Middleware` but without the ability to mutate actions or state.
 * Differences:
 *   * `getState` returns an `Immutable` version of state
 *   * `dispatch` accepts `Immutable` versions of actions
 *   * `action`s received will be `Immutable`
 */
export type ImmutableMiddleware<S, A extends Action> = (
  api: ImmutableMiddlewareAPI<S, A>
) => (next: Dispatch<A | Immutable<A>>) => (action: Immutable<A>) => unknown;

/**
 * Takes application-standard middleware dependencies
 * and returns a redux middleware.
 * Middleware will be of the `ImmutableMiddleware` variety. Not able to directly
 * change actions or state.
 */
export type ImmutableMiddlewareFactory<S = GlobalState> = (
  coreStart: CoreStart,
  depsStart: EndpointPluginStartDependencies
) => ImmutableMiddleware<S, AppAction>;

/**
 * Simple type for a redux selector.
 */
type Selector<S, R> = (state: S) => R;

/**
 * Takes a selector and an `ImmutableMiddleware`. The
 * middleware's version of `getState` will receive
 * the result of the selector instead of the global state.
 *
 * This allows middleware to have knowledge of only a subsection of state.
 *
 * `selector` returns an `Immutable` version of the substate.
 * `middleware` must be an `ImmutableMiddleware`.
 *
 * Returns a regular middleware, meant to be used with `applyMiddleware`.
 */
export type SubstateMiddlewareFactory = <Substate>(
  selector: Selector<GlobalState, Immutable<Substate>>,
  middleware: ImmutableMiddleware<Substate, AppAction>
) => Middleware<{}, GlobalState, Dispatch<AppAction | Immutable<AppAction>>>;

export interface HostState {
  /** list of host **/
  hosts: HostInfo[];
  /** number of items per page */
  pageSize: number;
  /** which page to show */
  pageIndex: number;
  /** total number of hosts returned */
  total: number;
  /** list page is retrieving data */
  loading: boolean;
  /** api error from retrieving host list */
  error?: ServerApiError;
  /** details data for a specific host */
  details?: Immutable<HostMetadata>;
  /** details page is retrieving data */
  detailsLoading: boolean;
  /** api error from retrieving host details */
  detailsError?: ServerApiError;
  /** Holds the Policy Response for the Host currently being displayed in the details */
  policyResponse?: HostPolicyResponse;
  /** current location info */
  location?: Immutable<EndpointAppLocation>;
}

/**
 * Query params on the host page parsed from the URL
 */
export interface HostIndexUIQueryParams {
  /** Selected host id shows host details flyout */
  selected_host?: string;
  /** How many items to show in list */
  page_size?: string;
  /** Which page to show */
  page_index?: string;
  /** show the policy response or host details */
  show?: string;
}

export interface ServerApiError {
  statusCode: number;
  error: string;
  message: string;
}

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
  /** current location information */
  location?: Immutable<EndpointAppLocation>;
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
 * The URL search params that are supported by the Policy List page view
 */
export interface PolicyListUrlSearchParams {
  page_index: number;
  page_size: number;
}

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

/** OS used in Policy */
export enum OS {
  windows = 'windows',
  mac = 'mac',
  linux = 'linux',
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

export interface GlobalState {
  readonly hostList: HostState;
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
  readonly alerts: Immutable<AlertData[]>;

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

export interface GetPolicyListResponse extends GetDatasourcesResponse {
  items: PolicyData[];
}

export interface GetPolicyResponse extends GetOneDatasourceResponse {
  item: PolicyData;
}

export interface UpdatePolicyResponse extends UpdateDatasourceResponse {
  item: PolicyData;
}

/**
 * Like `Reducer` from `redux` but it accepts immutable versions of `state` and `action`.
 * Use this type for all Reducers in order to help enforce our pattern of immutable state.
 */
export type ImmutableReducer<State, Action> = (
  state: Immutable<State> | undefined,
  action: Immutable<Action>
) => State | Immutable<State>;

/**
 * A alternate interface for `redux`'s `combineReducers`. Will work with the same underlying implementation,
 * but will enforce that `Immutable` versions of `state` and `action` are received.
 */
export type ImmutableCombineReducers = <S, A extends ReduxAction = ReduxAnyAction>(
  reducers: ImmutableReducersMapObject<S, A>
) => ImmutableReducer<S, A>;

/**
 * Like `redux`'s `ReducersMapObject` (which is used by `combineReducers`) but enforces that
 * the `state` and `action` received are `Immutable` versions.
 */
type ImmutableReducersMapObject<S, A extends ReduxAction = ReduxAction> = {
  [K in keyof S]: ImmutableReducer<S[K], A>;
};
