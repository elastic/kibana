/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { EndpointMetadata } from '../../../common/types';
import { AppAction } from './store/action';
import { AlertResultList, Immutable } from '../../../common/types';

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
  state: never;
  hash: string;
  key?: string;
}

export type AlertListData = AlertResultList;
export type AlertListState = Immutable<AlertResultList> & {
  readonly location?: Immutable<EndpointAppLocation>;
};
