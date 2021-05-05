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
import { AppAction } from '../../../../common/store/actions';
import { AppLocation, Immutable } from '../../../../../common/endpoint/types';
import { UserChangedUrl } from '../../../../common/store/routing/action';
import { MANAGEMENT_ROUTING_EVENT_FILTERS_PATH } from '../../../common/constants';
import { extractEventFiltetrsPageLocation } from '../../../common/routing';

import {
  EventFiltersInitForm,
  EventFiltersChangeForm,
  EventFiltersFormStateChanged,
  EventFiltersCreateSuccess,
  EventFiltersListPageStateChanged,
  EventFiltersListPageDataChanged,
  EventFiltersListPageDataExistsChanged,
} from './action';

import { EventFiltersListPageState } from '../state';
import { initialEventFiltersPageState } from './builders';
import { getListPageIsActive } from './selector';

type StateReducer = ImmutableReducer<EventFiltersListPageState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EventFiltersListPageState>,
  action: Immutable<T>
) => Immutable<EventFiltersListPageState>;

const isEventFiltersPageLocation = (location: Immutable<AppLocation>) => {
  return (
    matchPath(location.pathname ?? '', {
      path: MANAGEMENT_ROUTING_EVENT_FILTERS_PATH,
      exact: true,
    }) !== null
  );
};

// FIXME:PT might not need this. maybe delete
const handleEventFiltersListPageChanges: CaseReducer<EventFiltersListPageStateChanged> = (
  state,
  action
) => {
  return {
    ...state,
    listPage: action.payload,
  };
};

const handleEventFiltersListPageDataChanges: CaseReducer<EventFiltersListPageDataChanged> = (
  state,
  action
) => {
  return {
    ...state,
    listPage: {
      ...state.listPage,
      forceRefresh: false,
      data: action.payload,
    },
  };
};

const handleEventFiltersListPageDataExistChanges: CaseReducer<EventFiltersListPageDataExistsChanged> = (
  state,
  action
) => {
  return {
    ...state,
    listPage: {
      ...state.listPage,
      dataExist: action.payload,
    },
  };
};

const eventFiltersInitForm: CaseReducer<EventFiltersInitForm> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      entry: action.payload.entry,
      hasNameError: !action.payload.entry.name,
      hasOSError: !action.payload.entry.os_types?.length,
      submissionResourceState: {
        type: 'UninitialisedResourceState',
      },
    },
  };
};

const eventFiltersChangeForm: CaseReducer<EventFiltersChangeForm> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      entry: action.payload.entry,
      hasItemsError:
        action.payload.hasItemsError !== undefined
          ? action.payload.hasItemsError
          : state.form.hasItemsError,
      hasNameError:
        action.payload.hasNameError !== undefined
          ? action.payload.hasNameError
          : state.form.hasNameError,
      hasOSError:
        action.payload.hasOSError !== undefined ? action.payload.hasOSError : state.form.hasOSError,
    },
  };
};

const eventFiltersFormStateChanged: CaseReducer<EventFiltersFormStateChanged> = (state, action) => {
  return {
    ...state,
    form: {
      ...state.form,
      submissionResourceState: action.payload,
    },
  };
};

const eventFiltersCreateSuccess: CaseReducer<EventFiltersCreateSuccess> = (state, action) => {
  return {
    ...state,
    entries: [action.payload.exception, ...state.entries],
    // If we are on the List page, then force a refresh of data
    listPage: getListPageIsActive(state)
      ? {
          ...state.listPage,
          forceRefresh: true,
        }
      : state.listPage,
  };
};

const userChangedUrl: CaseReducer<UserChangedUrl> = (state, action) => {
  if (isEventFiltersPageLocation(action.payload)) {
    const location = extractEventFiltetrsPageLocation(parse(action.payload.search.slice(1)));
    return {
      ...state,
      location,
      listPage: {
        ...state.listPage,
        active: true,
      },
    };
  } else {
    // Reset the list page state if needed
    if (state.listPage.active) {
      const { listPage } = initialEventFiltersPageState();

      return {
        ...state,
        listPage,
      };
    }

    return state;
  }
};

export const eventFiltersPageReducer: StateReducer = (
  state = initialEventFiltersPageState(),
  action
) => {
  switch (action.type) {
    case 'eventFiltersInitForm':
      return eventFiltersInitForm(state, action);
    case 'eventFiltersChangeForm':
      return eventFiltersChangeForm(state, action);
    case 'eventFiltersFormStateChanged':
      return eventFiltersFormStateChanged(state, action);
    case 'eventFiltersCreateSuccess':
      return eventFiltersCreateSuccess(state, action);
    case 'userChangedUrl':
      return userChangedUrl(state, action);
  }

  // actions only handled if we're on the List Page
  if (getListPageIsActive(state)) {
    switch (action.type) {
      case 'eventFiltersListPageStateChanged':
        return handleEventFiltersListPageChanges(state, action);
      case 'eventFiltersListPageDataChanged':
        return handleEventFiltersListPageDataChanges(state, action);
      case 'eventFiltersListPageDataExistsChanged':
        return handleEventFiltersListPageDataExistChanges(state, action);
    }
  }

  return state;
};
