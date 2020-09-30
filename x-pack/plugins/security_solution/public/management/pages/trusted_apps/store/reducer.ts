/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-nodejs-modules
import { parse } from 'querystring';
import { matchPath } from 'react-router-dom';
import { ImmutableReducer } from '../../../../common/store';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { UserChangedUrl } from '../../../../common/store/routing/action';
import { AppAction } from '../../../../common/store/actions';
import { extractFirstParamValue, extractListPaginationParams } from '../../../common/routing';
import {
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../common/constants';

import {
  TrustedAppDeletionDialogClosed,
  TrustedAppDeletionDialogConfirmed,
  TrustedAppDeletionDialogStarted,
  TrustedAppDeletionSubmissionResourceStateChanged,
  TrustedAppsListDataOutdated,
  TrustedAppsListResourceStateChanged,
  ServerReturnedCreateTrustedAppFailure,
  ServerReturnedCreateTrustedAppSuccess,
  UserClickedSaveNewTrustedAppButton,
} from './action';
import { TrustedAppsListPageState } from '../state';

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
  return {
    ...state,
    listView: {
      ...state.listView,
      freshDataTimestamp: Date.now(),
    },
  };
};

const trustedAppsListResourceStateChanged: CaseReducer<TrustedAppsListResourceStateChanged> = (
  state,
  action
) => {
  return {
    ...state,
    listView: {
      ...state.listView,
      currentListResourceState: action.payload.newState,
    },
  };
};

const trustedAppDeletionSubmissionResourceStateChanged: CaseReducer<TrustedAppDeletionSubmissionResourceStateChanged> = (
  state,
  action
) => {
  return {
    ...state,
    deletionDialog: { ...state.deletionDialog, submissionResourceState: action.payload.newState },
  };
};

const trustedAppDeletionDialogStarted: CaseReducer<TrustedAppDeletionDialogStarted> = (
  state,
  action
) => {
  return {
    ...state,
    deletionDialog: {
      entry: action.payload.entry,
      confirmed: false,
      submissionResourceState: { type: 'UninitialisedResourceState' },
    },
  };
};

const trustedAppDeletionDialogConfirmed: CaseReducer<TrustedAppDeletionDialogConfirmed> = (
  state,
  action
) => {
  return { ...state, deletionDialog: { ...state.deletionDialog, confirmed: true } };
};

const trustedAppDeletionDialogClosed: CaseReducer<TrustedAppDeletionDialogClosed> = (
  state,
  action
) => {
  return { ...state, deletionDialog: initialDeletionDialogState() };
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isTrustedAppsPageLocation(action.payload)) {
    const parsedUrlsParams = parse(action.payload.search.slice(1));
    const paginationParams = extractListPaginationParams(parsedUrlsParams);
    const show =
      extractFirstParamValue(parsedUrlsParams, 'show') === 'create' ? 'create' : undefined;

    return {
      ...state,
      listView: {
        ...state.listView,
        currentPaginationInfo: {
          index: paginationParams.page_index,
          size: paginationParams.page_size,
        },
        show,
      },
      createView: show ? state.createView : undefined,
      active: true,
    };
  } else {
    return initialTrustedAppsPageState();
  }
};

const trustedAppsCreateResourceChanged: CaseReducer<
  | UserClickedSaveNewTrustedAppButton
  | ServerReturnedCreateTrustedAppFailure
  | ServerReturnedCreateTrustedAppSuccess
> = (state, action) => {
  return {
    ...state,
    createView: action.payload,
  };
};

const initialDeletionDialogState = (): TrustedAppsListPageState['deletionDialog'] => ({
  confirmed: false,
  submissionResourceState: { type: 'UninitialisedResourceState' },
});

export const initialTrustedAppsPageState = (): TrustedAppsListPageState => ({
  listView: {
    currentListResourceState: { type: 'UninitialisedResourceState' },
    currentPaginationInfo: {
      index: MANAGEMENT_DEFAULT_PAGE,
      size: MANAGEMENT_DEFAULT_PAGE_SIZE,
    },
    freshDataTimestamp: Date.now(),
    show: undefined,
  },
  deletionDialog: initialDeletionDialogState(),
  createView: undefined,
  active: false,
});

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

    case 'userChangedUrl':
      return userChangedUrl(state, action);

    case 'userClickedSaveNewTrustedAppButton':
    case 'serverReturnedCreateTrustedAppSuccess':
    case 'serverReturnedCreateTrustedAppFailure':
      return trustedAppsCreateResourceChanged(state, action);
  }

  return state;
};
