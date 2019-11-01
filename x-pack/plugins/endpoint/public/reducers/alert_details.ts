/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { actions as alertDetailsActions, AlertDetailsAction } from '../actions/alert_details';

// TODO: type hits properly
interface AlertDetailsState {
  data: object | null;
}

const initialState: AlertDetailsState = {
  data: null,
};

// TODO: Should we use Immutable.js?
export function reducer(state = initialState, action: AlertDetailsAction): AlertDetailsState {
  switch (action.type) {
    case alertDetailsActions.serverReturnedAlertDetailsData.type:
      return {
        ...state,
        data: action.payload[0],
      };
    default:
      return state;
  }
}
