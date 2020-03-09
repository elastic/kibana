/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import {
  EndpointMetadata,
  AlertData,
  AlertResultList,
  Immutable,
  ImmutableArray,
} from '../../../common/types';
import { AppAction } from './store/action';

export { AppAction };
export type MiddlewareFactory<S = GlobalState> = (
  coreStart: CoreStart
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, S>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export interface ManagementListState {
  endpoints: EndpointMetadata[];
  total: number;
  pageSize: number;
  pageIndex: number;
  loading: boolean;
}

export interface ManagementListPagination {
  pageIndex: number;
  pageSize: number;
}

// REFACTOR to use Types from Ingest Manager - see: https://github.com/elastic/endpoint-app-team/issues/150
export interface PolicyData {
  name: string;
  total: number;
  pending: number;
  failed: number;
  created_by: string;
  created: string;
  updated_by: string;
  updated: string;
}

/**
 * Policy list store state
 */
export interface PolicyListState {
  /** Array of policy items  */
  policyItems: PolicyData[];
  /** total number of policies */
  total: number;
  /** Number of policies per page */
  pageSize: number;
  /** page number (zero based) */
  pageIndex: number;
  /** data is being retrieved from server */
  isLoading: boolean;
}

export interface GlobalState {
  readonly managementList: ManagementListState;
  readonly alertList: AlertListState;
  readonly policyList: PolicyListState;
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
  readonly alertDetails?: Immutable<AlertData>;
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
}

/**
 * Query params to pass to the alert API when fetching new data.
 */
export interface AlertsAPIQueryParams {
  /**
   * Number of results to return.
   */
  page_size?: string;
  /**
   * 0-based index of 'page' to return.
   */
  page_index?: string;
}
