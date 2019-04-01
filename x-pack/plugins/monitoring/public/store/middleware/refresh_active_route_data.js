/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { refreshActiveRouteData as refreshActiveRouteDataAction, updateTimeFromDatePicker } from '../actions';
import { findRouteFromLocation } from '../../routes';

function refreshRouteData(store) {
  const route = findRouteFromLocation(window.location);
  store.dispatch(route.fetchData());
}

export const refreshActiveRouteData = store => next => async action => {
  if (action.type === updateTimeFromDatePicker().type) {
    const result = next(action);
    refreshRouteData(store);
    return result;
  }

  if (action.type === refreshActiveRouteDataAction().type) {
    refreshRouteData(store);
  }

  return next(action);
};
