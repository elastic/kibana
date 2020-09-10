/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AsyncResourceState, TrustedAppCreatePending, TrustedAppsListData } from '../state';

export interface TrustedAppsListResourceStateChanged {
  type: 'trustedAppsListResourceStateChanged';
  payload: {
    newState: AsyncResourceState<TrustedAppsListData>;
  };
}

export interface UserClickedSaveNewTrustedAppButton {
  type: 'userClickedSaveNewTrustedAppButton';
  payload: TrustedAppCreatePending;
}

export type TrustedAppsPageAction =
  | TrustedAppsListResourceStateChanged
  | UserClickedSaveNewTrustedAppButton;
