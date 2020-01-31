/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { Immutable, AlertData, EndpointMetadata } from '../../../common/types';
import { AppAction } from './store/action';

export type MiddlewareFactory = (
  coreStart: CoreStart
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, GlobalState>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export type AlertListState = Immutable<{
  alerts: AlertData[];
}>;

export interface ManagementState {
  endpoints: EndpointMetadata[];
  total: number;
  pageSize: number;
  pageIndex: number;
}

export interface ManagementPagination {
  pageIndex: number;
  pageSize: number;
}

export interface GlobalState {
  readonly endpointList: ManagementState;
  readonly alertList: AlertListState;
}
