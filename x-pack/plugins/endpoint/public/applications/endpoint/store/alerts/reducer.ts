/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { AlertListState } from '../../types';
import { AppAction } from '../action';

const initialState = (): AlertListState => {
  return {
    alerts: [],
    alertDetails: undefined,
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    location: undefined,
    searchBar: {
      patterns: [],
    },
    allowlistModalIsOpen: false,
    allowlistForm: {
      advancedOptionsAreOpen: false,
      comment: '',
      filePath: false,
      sha256: false,
      signer: false,
      actingProcessPath: false,
      closeAlerts: false,
    },
  };
};

export const alertListReducer: Reducer<AlertListState, AppAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'serverReturnedAlertsData') {
    const {
      alerts,
      request_page_size: pageSize,
      request_page_index: pageIndex,
      total,
    } = action.payload;
    return {
      ...state,
      alerts,
      pageSize,
      // request_page_index is optional because right now we support both
      // simple and cursor based pagination.
      pageIndex: pageIndex || 0,
      total,
    };
  } else if (action.type === 'userChangedUrl') {
    return {
      ...state,
      location: action.payload,
    };
  } else if (action.type === 'serverReturnedAlertDetailsData') {
    return {
      ...state,
      alertDetails: action.payload,
    };
  } else if (action.type === 'serverReturnedSearchBarIndexPatterns') {
    return {
      ...state,
      searchBar: {
        ...state.searchBar,
        patterns: action.payload,
      },
    };
  } else if (action.type === 'userOpenedAllowlistModal') {
    return {
      ...state,
      allowlistModalIsOpen: true,
    };
  } else if (action.type === 'userClosedAllowlistModal') {
    return {
      ...state,
      allowlistModalIsOpen: false,
    };
  } else if (action.type === 'userOpenedAllowlistAdvancedOptions') {
    return {
      ...state,
      allowlistForm: {
        ...state.allowlistForm,
        advancedOptionsAreOpen: true,
      },
    };
  } else if (action.type === 'userClosedAllowlistAdvancedOptions') {
    return {
      ...state,
      allowlistForm: {
        ...state.allowlistForm,
        advancedOptionsAreOpen: false,
      },
    };
  } else if (action.type === 'userChangedAllowlistForm') {
    const [key, value] = action.payload;
    return {
      ...state,
      allowlistForm: {
        ...state.allowlistForm,
        [key]: value,
      },
    };
  }

  return state;
};
