/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { AsyncResourceState } from '../../../state/async_resource_state';
import { GetPolicyListResponse } from '../../policy/types';

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
  filter: string;
  includedPolicies: string;
}

export type ViewType = 'list' | 'grid';

export interface TrustedAppsListPageLocation {
  page_index: number;
  page_size: number;
  view_type: ViewType;
  show?: 'create' | 'edit';
  /** Used for editing. The ID of the selected trusted app */
  id?: string;
  filter: string;
  // A string with comma dlimetered list of included policy IDs
  included_policies: string;
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
    /** The trusted app to be edited (when in edit mode)  */
    editItem?: AsyncResourceState<TrustedApp>;
    confirmed: boolean;
    submissionResourceState: AsyncResourceState<TrustedApp>;
  };
  /** A list of all available polices for use in associating TA to policies */
  policies: AsyncResourceState<GetPolicyListResponse>;
  location: TrustedAppsListPageLocation;
  active: boolean;
  forceRefresh: boolean;
}
