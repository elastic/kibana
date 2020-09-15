/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';

import { TrustedApp } from '../../../../../common/endpoint/types';
import { AsyncResourceState, TrustedAppsListData } from '../state';

export type TrustedAppsListDataOutdated = Action<'trustedAppsListDataOutdated'>;

interface ResourceStateChanged<T, D = null> extends Action<T> {
  payload: { newState: AsyncResourceState<D> };
}

export type TrustedAppsListResourceStateChanged = ResourceStateChanged<
  'trustedAppsListResourceStateChanged',
  TrustedAppsListData
>;

export type TrustedAppDeletionSubmissionResourceStateChanged = ResourceStateChanged<
  'trustedAppDeletionSubmissionResourceStateChanged'
>;

export type TrustedAppDeletionDialogStarted = Action<'trustedAppDeletionDialogStarted'> & {
  payload: {
    entry: TrustedApp;
  };
};

export type TrustedAppDeletionDialogConfirmed = Action<'trustedAppDeletionDialogConfirmed'>;

export type TrustedAppDeletionDialogClosed = Action<'trustedAppDeletionDialogClosed'>;

export type TrustedAppsPageAction =
  | TrustedAppsListDataOutdated
  | TrustedAppsListResourceStateChanged
  | TrustedAppDeletionSubmissionResourceStateChanged
  | TrustedAppDeletionDialogStarted
  | TrustedAppDeletionDialogConfirmed
  | TrustedAppDeletionDialogClosed;
