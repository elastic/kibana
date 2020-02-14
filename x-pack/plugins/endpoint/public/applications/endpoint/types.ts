/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { EndpointMetadata } from '../../../common/types';
import { AppAction } from './store/action';
import { AlertResultList } from '../../../common/types';

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

export interface GlobalState {
  readonly managementList: ManagementListState;
  readonly alertList: AlertListState;
}

export type AlertListData = AlertResultList;
export type AlertListState = AlertResultList;
export type CreateStructuredSelector = <
  SelectorMap extends { [key: string]: (...args: never[]) => unknown }
>(
  selectorMap: SelectorMap
) => (
  state: SelectorMap[keyof SelectorMap] extends (state: infer State) => unknown ? State : never
) => {
  [Key in keyof SelectorMap]: ReturnType<SelectorMap[Key]>;
};
