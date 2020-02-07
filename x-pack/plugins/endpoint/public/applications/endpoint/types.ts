/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, MiddlewareAPI } from 'redux';
import { CoreStart } from 'kibana/public';
import { Immutable, AlertData } from '../../../common/types';
import { EndpointListState } from './store/endpoint_list';
import { AppAction } from './store/action';

export type MiddlewareFactory = (
  coreStart: CoreStart
) => (
  api: MiddlewareAPI<Dispatch<AppAction>, GlobalState>
) => (next: Dispatch<AppAction>) => (action: AppAction) => unknown;

export type AlertListState = Immutable<{
  alerts: AlertData[];
}>;

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
  readonly endpointList: EndpointListState;
  readonly alertList: AlertListState;
  readonly policyList: PolicyListState;
}
