/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { AsyncResourceState } from '.';

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

export interface TrustedAppsListPageState {
  listView: {
    currentListResourceState: AsyncResourceState<TrustedAppsListData>;
    currentPaginationInfo: PaginationInfo;
    freshDataTimestamp: number;
  };
  deletionDialog: {
    entry?: TrustedApp;
    confirmed: boolean;
    submissionResourceState: AsyncResourceState;
  };
  active: boolean;
}
