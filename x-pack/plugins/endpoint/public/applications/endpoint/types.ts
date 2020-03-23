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
import { Datasource } from '../../../../ingest_manager/common/types/models';

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
 * An Endpoint Policy.
 */
export type PolicyData = Datasource;

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
 * Policy list store state
 */
export interface PolicyDetailsState {
  /** A single policy item  */
  policyItem: PolicyData | undefined;
  /** data is being retrieved from server */
  isLoading: boolean;
  /** current location of the application */
  location?: Immutable<EndpointAppLocation>;
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
