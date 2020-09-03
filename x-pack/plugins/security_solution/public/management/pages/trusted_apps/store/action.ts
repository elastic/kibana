/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AsyncResourceState } from '../state/async_resource_state';
import { TrustedAppsListData } from '../state/trusted_apps_list_page_state';

export interface TrustedAppsListResourceStateChanged {
  type: 'trustedAppsListResourceStateChanged';
  payload: {
    newState: AsyncResourceState<TrustedAppsListData>;
  };
}

export type TrustedAppsPageAction = TrustedAppsListResourceStateChanged;
