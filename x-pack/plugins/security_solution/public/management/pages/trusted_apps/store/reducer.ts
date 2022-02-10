/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { parse } from 'querystring';
import { matchPath } from 'react-router-dom';
import { ImmutableReducer } from '../../../../common/store';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { UserChangedUrl } from '../../../../common/store/routing/action';
import { AppAction } from '../../../../common/store/actions';
import { extractTrustedAppsListPageLocation } from '../../../common/routing';

import { MANAGEMENT_ROUTING_TRUSTED_APPS_PATH } from '../../../common/constants';

import {
  TrustedAppDeletionDialogClosed,
  TrustedAppDeletionDialogConfirmed,
  TrustedAppDeletionDialogStarted,
  TrustedAppDeletionSubmissionResourceStateChanged,
  TrustedAppCreationSubmissionResourceStateChanged,
  TrustedAppsListDataOutdated,
  TrustedAppsListResourceStateChanged,
  TrustedAppCreationDialogStarted,
  TrustedAppCreationDialogFormStateUpdated,
  TrustedAppCreationDialogConfirmed,
  TrustedAppCreationDialogClosed,
  TrustedAppsExistResponse,
  TrustedAppsPoliciesStateChanged,
  TrustedAppCreationEditItemStateChanged,
  TrustedAppForceRefresh,
} from './action';

import { TrustedAppsListPageState } from '../state';
import {
  initialCreationDialogState,
  initialDeletionDialogState,
  initialTrustedAppsPageState,
} from './builders';
import { entriesExistState, trustedAppsListPageActive } from './selectors';

type StateReducer = ImmutableReducer<TrustedAppsListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<TrustedAppsListPageState>,
  action: Immutable<T>
) => Immutable<TrustedAppsListPageState>;

const isTrustedAppsPageLocation = (location: Immutable<AppLocation>) => {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
      exact: true,
    }) !== null
  );
};

const trustedAppsListDataOutdated: CaseReducer<TrustedAppsListDataOutdated> = (state, action) => {
  return { ...state, listView: { ...state.listView, freshDataTimestamp: Date.now() } };
};

const trustedAppsListResourceStateChanged: CaseReducer<TrustedAppsListResourceStateChanged> = (
  state,
  action
) => {
  return { ...state, listView: { ...state.listView, listResourceState: action.payload.newState } };
};

const trustedAppDeletionSubmissionResourceStateChanged: CaseReducer<
  TrustedAppDeletionSubmissionResourceStateChanged
> = (state, action) => {
  return {
    ...state,
    deletionDialog: { ...state.deletionDialog, submissionResourceState: action.payload.newState },
  };
};

const trustedAppDeletionDialogStarted: CaseReducer<TrustedAppDeletionDialogStarted> = (
  state,
  action
) => {
  return { ...state, deletionDialog: { ...initialDeletionDialogState(), ...action.payload } };
};

const trustedAppDeletionDialogConfirmed: CaseReducer<TrustedAppDeletionDialogConfirmed> = (
  state
) => {
  return { ...state, deletionDialog: { ...state.deletionDialog, confirmed: true } };
};

const trustedAppDeletionDialogClosed: CaseReducer<TrustedAppDeletionDialogClosed> = (state) => {
  return { ...state, deletionDialog: initialDeletionDialogState() };
};

const trustedAppCreationSubmissionResourceStateChanged: CaseReducer<
  TrustedAppCreationSubmissionResourceStateChanged
> = (state, action) => {
  return {
    ...state,
    creationDialog: { ...state.creationDialog, submissionResourceState: action.payload.newState },
  };
};

const trustedAppCreationDialogStarted: CaseReducer<TrustedAppCreationDialogStarted> = (
  state,
  action
) => {
  return {
    ...state,
    creationDialog: {
      ...initialCreationDialogState(),
      formState: { ...action.payload, isValid: false },
    },
  };
};

const trustedAppCreationDialogFormStateUpdated: CaseReducer<
  TrustedAppCreationDialogFormStateUpdated
> = (state, action) => {
  return {
    ...state,
    creationDialog: { ...state.creationDialog, formState: { ...action.payload } },
  };
};

const handleUpdateToEditItemState: CaseReducer<TrustedAppCreationEditItemStateChanged> = (
  state,
  action
) => {
  return {
    ...state,
    creationDialog: { ...state.creationDialog, editItem: action.payload },
  };
};

const trustedAppCreationDialogConfirmed: CaseReducer<TrustedAppCreationDialogConfirmed> = (
  state
) => {
  return { ...state, creationDialog: { ...state.creationDialog, confirmed: true } };
};

const trustedAppCreationDialogClosed: CaseReducer<TrustedAppCreationDialogClosed> = (state) => {
  return { ...state, creationDialog: initialCreationDialogState() };
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isTrustedAppsPageLocation(action.payload)) {
    const location = extractTrustedAppsListPageLocation(parse(action.payload.search.slice(1)));

    return { ...state, active: true, location };
  } else {
    return initialTrustedAppsPageState();
  }
};

const updateEntriesExists: CaseReducer<TrustedAppsExistResponse> = (state, { payload }) => {
  if (entriesExistState(state) !== payload) {
    return {
      ...state,
      entriesExist: payload,
    };
  }
  return state;
};

const updatePolicies: CaseReducer<TrustedAppsPoliciesStateChanged> = (state, { payload }) => {
  if (trustedAppsListPageActive(state)) {
    return {
      ...state,
      policies: payload,
    };
  }
  return state;
};

const forceRefresh: CaseReducer<TrustedAppForceRefresh> = (state, { payload }) => {
  return {
    ...state,
    forceRefresh: payload.forceRefresh,
  };
};

export const trustedAppsPageReducer: StateReducer = (
  state = initialTrustedAppsPageState(),
  action
) => {
  switch (action.type) {
    case 'trustedAppsListDataOutdated':
      return trustedAppsListDataOutdated(state, action);

    case 'trustedAppsListResourceStateChanged':
      return trustedAppsListResourceStateChanged(state, action);

    case 'trustedAppDeletionSubmissionResourceStateChanged':
      return trustedAppDeletionSubmissionResourceStateChanged(state, action);

    case 'trustedAppDeletionDialogStarted':
      return trustedAppDeletionDialogStarted(state, action);

    case 'trustedAppDeletionDialogConfirmed':
      return trustedAppDeletionDialogConfirmed(state, action);

    case 'trustedAppDeletionDialogClosed':
      return trustedAppDeletionDialogClosed(state, action);

    case 'trustedAppCreationSubmissionResourceStateChanged':
      return trustedAppCreationSubmissionResourceStateChanged(state, action);

    case 'trustedAppCreationDialogStarted':
      return trustedAppCreationDialogStarted(state, action);

    case 'trustedAppCreationDialogFormStateUpdated':
      return trustedAppCreationDialogFormStateUpdated(state, action);

    case 'trustedAppCreationEditItemStateChanged':
      return handleUpdateToEditItemState(state, action);

    case 'trustedAppCreationDialogConfirmed':
      return trustedAppCreationDialogConfirmed(state, action);

    case 'trustedAppCreationDialogClosed':
      return trustedAppCreationDialogClosed(state, action);

    case 'userChangedUrl':
      return userChangedUrl(state, action);

    case 'trustedAppsExistStateChanged':
      return updateEntriesExists(state, action);

    case 'trustedAppsPoliciesStateChanged':
      return updatePolicies(state, action);

    case 'trustedAppForceRefresh':
      return forceRefresh(state, action);
  }

  return state;
};
