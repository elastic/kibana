/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EDIT_CLUSTER_START,
  EDIT_CLUSTER_STOP,
} from '../action_types';

const initialState = {
  clusterName: undefined,
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
      };

    default:
      return state;
  }
}
