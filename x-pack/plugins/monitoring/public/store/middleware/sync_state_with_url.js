/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import qs from 'querystring';
import { isEqual, isEmpty, pick } from 'lodash';
import rison from 'rison-node';
import { getLocalState, getDateIsSet } from '../selectors';
import { updateDateFromUrl } from '../actions';

function getUpdatedUrlWithState(state, newRoute = undefined) {
  const cleanState = pick(state, value => !!value);
  const encodedState = rison.encode(cleanState);
  const hash = window.location.hash;
  const [route, queryParamsAsString] = hash.split('?');
  const queryParams = qs.parse(queryParamsAsString);
  queryParams._g = encodedState;
  const updatedQueryParamsAsString = qs.stringify(queryParams);
  const updatedHash = `${newRoute || route}?${updatedQueryParamsAsString}`;

  return updatedHash;
}

function writeToUrl(state) {
  const updated = getUpdatedUrlWithState(state);
  if (window.history.pushState) {
    window.history.pushState(null, null, updated);
  }
  else {
    window.location.hash = updated;
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

export const syncStateWithUrl = store => next => action => {
  const result = next(action);
  if (actionsToIgnore.includes(action.type)) {
    return result;
  }

  const state = store.getState();
  const urlState = readFromUrl();
  const localState = getLocalState(state);

  const willSyncFromUrl = (!getDateIsSet(state) || !isStateValid(localState)) && isStateValid(urlState);
  const willSyncToUrl = !willSyncFromUrl && !isEqual(urlState, localState);
  // console.log({ willSyncFromUrl, willSyncToUrl });

  if (willSyncFromUrl) {
    store.dispatch(updateDateFromUrl(urlState));
  } else if (willSyncToUrl) {
    writeToUrl(localState);
  }
  return result;
};
