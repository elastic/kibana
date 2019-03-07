/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import { AnyAction } from 'redux';

export const LOCATION_UPDATE = 'LOCATION_UPDATE';

export function locationReducer(
  state = { pathname: '', search: '', hash: '' },
  action: AnyAction
) {
  switch (action.type) {
    case LOCATION_UPDATE:
      return action.location;
    default:
      return state;
  }
}

export function updateLocation(nextLocation: Location) {
  return {
    type: LOCATION_UPDATE,
    location: nextLocation
  };
}
