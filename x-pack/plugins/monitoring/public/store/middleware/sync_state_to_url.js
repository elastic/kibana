/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import qs from 'querystring';
import { isEqual, isEmpty } from 'lodash';
import rison from 'rison-node';
import { getDateForUrlComparison, getDateIsSet } from '../selectors';
import { updateDateFromUrl } from '../actions';

function writeToUrl(state) {
  const encodedState = rison.encode(state);
  const hash = window.location.hash;
  const [route, queryParamsAsString] = hash.split('?');
  const queryParams = qs.parse(queryParamsAsString);
  queryParams._g = encodedState;
  const updatedQueryParamsAsString = qs.stringify(queryParams);
  const updatedHash = `${route}?${updatedQueryParamsAsString}`;

  if (window.history.pushState) {
    window.history.pushState(null, null, updatedHash);
  }
  else {
    window.location.hash = updatedHash;
  }
}

function readFromUrl() {
  const hash = window.location.hash;
  if (!hash) {
    return null;
  }

  const queryParamsAsString = hash.split('?')[1];
  const queryParams = qs.parse(queryParamsAsString);
  const encodedState = queryParams._g;
  if (!encodedState) {
    return null;
  }
  return rison.decode(encodedState);
}

function isStateValid(state) {
  if (isEmpty(state) || isEmpty(state.refreshInterval)) {
    return false;
  }
  return true;
}

const actionsToIgnore = [
  updateDateFromUrl().type,
];

export const syncStateToUrl = store => next => action => {
  if (actionsToIgnore.includes(action.type)) {
    return next(action);
  }
  const state = store.getState();
  const urlState = readFromUrl();
  const localState = getDateForUrlComparison(state);
  const isLocalSet = getDateIsSet(state);
  if (!isLocalSet && isStateValid(urlState)) {
    store.dispatch(updateDateFromUrl(urlState));
  } else if (!isEqual(urlState, localState)) {
    writeToUrl(localState);
  }
  return next(action);
};
