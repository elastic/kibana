/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';

import { NewTrustedApp, TrustedApp } from '../../../../../common/endpoint/types';
import { AsyncResourceState, TrustedAppsListData } from '../state';
import { GetPolicyListResponse } from '../../policy/types';

export type TrustedAppsListDataOutdated = Action<'trustedAppsListDataOutdated'>;

interface ResourceStateChanged<T, D = null> extends Action<T> {
  payload: { newState: AsyncResourceState<D> };
}

export type TrustedAppsListResourceStateChanged = ResourceStateChanged<
  'trustedAppsListResourceStateChanged',
  TrustedAppsListData
>;

export type TrustedAppDeletionSubmissionResourceStateChanged = ResourceStateChanged<'trustedAppDeletionSubmissionResourceStateChanged'>;

export type TrustedAppDeletionDialogStarted = Action<'trustedAppDeletionDialogStarted'> & {
  payload: {
    entry: TrustedApp;
  };
};

export type TrustedAppDeletionDialogConfirmed = Action<'trustedAppDeletionDialogConfirmed'>;

export type TrustedAppDeletionDialogClosed = Action<'trustedAppDeletionDialogClosed'>;

export type TrustedAppCreationSubmissionResourceStateChanged = ResourceStateChanged<
  'trustedAppCreationSubmissionResourceStateChanged',
  TrustedApp
>;

export type TrustedAppCreationDialogStarted = Action<'trustedAppCreationDialogStarted'> & {
  payload: {
    entry: NewTrustedApp;
  };
};

export type TrustedAppCreationDialogFormStateUpdated = Action<'trustedAppCreationDialogFormStateUpdated'> & {
  payload: {
    entry: NewTrustedApp;
    isValid: boolean;
  };
};

export type TrustedAppCreationEditItemStateChanged = Action<'trustedAppCreationEditItemStateChanged'> & {
  payload: AsyncResourceState<TrustedApp>;
};

export type TrustedAppCreationDialogConfirmed = Action<'trustedAppCreationDialogConfirmed'>;

export type TrustedAppCreationDialogClosed = Action<'trustedAppCreationDialogClosed'>;

export type TrustedAppsExistResponse = Action<'trustedAppsExistStateChanged'> & {
  payload: AsyncResourceState<boolean>;
};

export type TrustedAppsPoliciesStateChanged = Action<'trustedAppsPoliciesStateChanged'> & {
  payload: AsyncResourceState<GetPolicyListResponse>;
};

export type TrustedAppForceRefresh = Action<'trustedAppForceRefresh'> & {
  payload: {
    forceRefresh: boolean;
  };
};

export type TrustedAppsPageAction =
  | TrustedAppsListDataOutdated
  | TrustedAppsListResourceStateChanged
  | TrustedAppDeletionSubmissionResourceStateChanged
  | TrustedAppDeletionDialogStarted
  | TrustedAppDeletionDialogConfirmed
  | TrustedAppDeletionDialogClosed
  | TrustedAppCreationSubmissionResourceStateChanged
  | TrustedAppCreationEditItemStateChanged
  | TrustedAppCreationDialogStarted
  | TrustedAppCreationDialogFormStateUpdated
  | TrustedAppCreationDialogConfirmed
  | TrustedAppsExistResponse
  | TrustedAppsPoliciesStateChanged
  | TrustedAppCreationDialogClosed
  | TrustedAppForceRefresh;
