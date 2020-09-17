/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AsyncResourceState,
  TrustedAppCreateFailure,
  TrustedAppCreatePending,
  TrustedAppCreateSuccess,
  TrustedAppsListData,
} from '../state';

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

export interface ServerReturnedCreateTrustedAppSuccess {
  type: 'serverReturnedCreateTrustedAppSuccess';
  payload: TrustedAppCreateSuccess;
}

export interface ServerReturnedCreateTrustedAppFailure {
  type: 'serverReturnedCreateTrustedAppFailure';
  payload: TrustedAppCreateFailure;
}

export type TrustedAppsPageAction =
  | TrustedAppsListResourceStateChanged
  | UserClickedSaveNewTrustedAppButton
  | ServerReturnedCreateTrustedAppSuccess
  | ServerReturnedCreateTrustedAppFailure;
