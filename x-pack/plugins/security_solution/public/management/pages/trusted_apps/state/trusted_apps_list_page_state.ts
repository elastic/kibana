/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { AsyncResourceState } from '.';
import { TrustedAppsUrlParams } from '../types';

export interface PaginationInfo {
  index: number;
  size: number;
}

export interface TrustedAppsListData {
  items: TrustedApp[];
  totalItemsCount: number;
  paginationInfo: PaginationInfo;
  timestamp: number;
}

/** Store State when an API request has been sent to create a new trusted app entry */
export interface TrustedAppCreatePending {
  type: 'pending';
  data: NewTrustedApp;
}

/** Store State when creation of a new Trusted APP entry was successful */
export interface TrustedAppCreateSuccess {
  type: 'success';
  data: TrustedApp;
}

/** Store State when creation of a new Trusted App Entry failed */
export interface TrustedAppCreateFailure {
  type: 'failure';
  data: ServerApiError;
}

export interface TrustedAppsListPageState {
  listView: {
    currentListResourceState: AsyncResourceState<TrustedAppsListData>;
    currentPaginationInfo: PaginationInfo;
    freshDataTimestamp: number;
    show: TrustedAppsUrlParams['show'] | undefined;
  };
  deletionDialog: {
    entry?: TrustedApp;
    confirmed: boolean;
    submissionResourceState: AsyncResourceState;
  };
  createView:
    | undefined
    | TrustedAppCreatePending
    | TrustedAppCreateSuccess
    | TrustedAppCreateFailure;
  active: boolean;
}
