/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { createSelector } from 'reselect';
import { LOCATION_UPDATE } from './location';
import { toQuery, legacyDecodeURIComponent } from '../utils/url';
import { getDefaultTransactionId } from './transactionDistribution';
import { getDefaultTransactionType } from './service';

// ACTION TYPES
export const TIMEPICKER_UPDATE = 'TIMEPICKER_UPDATE';

// "urlParams" contains path and query parameters from the url, that can be easily consumed from
// any (container) component with access to the store

// Example:
// url: /opbeans-backend/Brewing%20Bot?transactionId=1321
// serviceName: opbeans-backend (path param)
// transactionType: Brewing%20Bot (path param)
// transactionId: 1321 (query param)
function urlParams(state = {}, action) {
  switch (action.type) {
    case LOCATION_UPDATE: {
      const {
        serviceName,
        transactionType,
        transactionName,
        errorGroupId
      } = getPathParams(action.location.pathname);

      const {
        transactionId,
        detailTab,
        spanId,
        page,
        sortBy,
        sortOrder,
        q
      } = toQuery(action.location.search);

      return {
        ...state,

        // query params
        q,
        sortBy,
        sortOrder,
        page: toNumber(page) || 0,
        transactionId,
        detailTab,
        spanId: toNumber(spanId),

        // path params
        serviceName,
        transactionType: legacyDecodeURIComponent(transactionType),
        transactionName: legacyDecodeURIComponent(transactionName),
        errorGroupId
      };
    }

    case TIMEPICKER_UPDATE:
      return { ...state, start: action.time.min, end: action.time.max };

    default:
      return state;
  }
}

function toNumber(value) {
  if (value != null) {
    return parseInt(value, 10);
  }
}

function getPathAsArray(pathname) {
  return _.compact(pathname.split('/'));
}

function getPathParams(pathname) {
  const paths = getPathAsArray(pathname);
  const pageName = paths[1];

  switch (pageName) {
    case 'transactions':
      return {
        serviceName: paths[0],
        transactionType: paths[2],
        transactionName: paths[3]
      };
    case 'errors':
      return {
        serviceName: paths[0],
        errorGroupId: paths[2]
      };
    default:
      return {};
  }
}

// ACTION CREATORS
export function updateTimePicker(time) {
  return { type: TIMEPICKER_UPDATE, time };
}

// Selectors
export const getUrlParams = createSelector(
  state => state.urlParams,
  getDefaultTransactionType,
  getDefaultTransactionId,
  (urlParams, transactionType, transactionId) => {
    return _.defaults({}, urlParams, {
      transactionType,
      transactionId
    });
  }
);

export default urlParams;
