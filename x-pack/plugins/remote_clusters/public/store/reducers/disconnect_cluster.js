/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DISCONNECT_CLUSTERS_START,
  DISCONNECT_CLUSTERS_SUCCESS,
  DISCONNECT_CLUSTERS_FAILURE,
} from '../action_types';

const initialState = {
  isDisconnecting: false,
};

export function disconnectCluster(state = initialState, action) {
  const { type } = action;

  switch (type) {
    case DISCONNECT_CLUSTERS_START:
      return {
        isDisconnecting: true,
      };

    case DISCONNECT_CLUSTERS_FAILURE:
    case DISCONNECT_CLUSTERS_SUCCESS:
      return {
        isDisconnecting: false,
      };

    default:
      return state;
  }
}
