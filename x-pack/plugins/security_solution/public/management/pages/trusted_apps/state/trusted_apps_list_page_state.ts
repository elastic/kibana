/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { AsyncResourceState } from '.';

export interface Pagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
}

export interface TrustedAppsListData {
  items: TrustedApp[];
  pageIndex: number;
  pageSize: number;
  timestamp: number;
  totalItemsCount: number;
}

export type ViewType = 'list' | 'grid';

export interface TrustedAppsListPageLocation {
  page_index: number;
  page_size: number;
  view_type: ViewType;
  show?: 'create';
}

export interface TrustedAppsListPageState {
  /** Represents if trusted apps entries exist, regardless of whether the list is showing results
   * or not (which could use filtering in the future)
   */
  entriesExist: AsyncResourceState<boolean>;
  listView: {
    listResourceState: AsyncResourceState<TrustedAppsListData>;
    freshDataTimestamp: number;
  };
  deletionDialog: {
    entry?: TrustedApp;
    confirmed: boolean;
    submissionResourceState: AsyncResourceState;
  };
  creationDialog: {
    formState?: {
      entry: NewTrustedApp;
      isValid: boolean;
    };
    confirmed: boolean;
    submissionResourceState: AsyncResourceState<TrustedApp>;
  };
  location: TrustedAppsListPageLocation;
  active: boolean;
}
