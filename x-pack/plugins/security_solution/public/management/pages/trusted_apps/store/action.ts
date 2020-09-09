/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AsyncResourceState, TrustedAppsListData } from '../state';

export interface TrustedAppsListResourceStateChanged {
  type: 'trustedAppsListResourceStateChanged';
  payload: {
    newState: AsyncResourceState<TrustedAppsListData>;
  };
}

export type TrustedAppsPageAction = TrustedAppsListResourceStateChanged;
