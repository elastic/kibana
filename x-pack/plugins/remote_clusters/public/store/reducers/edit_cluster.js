/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EDIT_CLUSTER_START,
  EDIT_CLUSTER_STOP,
  EDIT_CLUSTER_SAVE,
  EDIT_CLUSTER_SUCCESS,
  EDIT_CLUSTER_FAILURE,
  CLEAR_EDIT_CLUSTER_ERRORS,
} from '../action_types';

const initialState = {
  clusterName: undefined,
  isEditing: false,
  error: undefined,
};

export function editCluster(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case EDIT_CLUSTER_START:
      const {
        clusterName,
      } = payload;

      return {
        clusterName,
      };

    case EDIT_CLUSTER_STOP:
      return {
        clusterName: undefined,
        isEditing: false,
        error: undefined,
      };

    case EDIT_CLUSTER_SAVE:
      return {
        ...state,
        isEditing: true,
      };

    case EDIT_CLUSTER_SUCCESS:
      return {
        ...state,
        isEditing: false,
      };

    case EDIT_CLUSTER_FAILURE:
      return {
        ...state,
        error: payload.error,
        isEditing: false,
      };

    case CLEAR_EDIT_CLUSTER_ERRORS:
      return {
        ...state,
        error: undefined,
      };

    default:
      return state;
  }
}
