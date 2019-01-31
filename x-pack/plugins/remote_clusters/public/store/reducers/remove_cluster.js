/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  REMOVE_CLUSTERS_START,
  REMOVE_CLUSTERS_FINISH,
} from '../action_types';

const initialState = {
  isRemoving: false,
};

export function removeCluster(state = initialState, action) {
  const { type } = action;

  switch (type) {
    case REMOVE_CLUSTERS_START:
      return {
        isRemoving: true,
      };

    case REMOVE_CLUSTERS_FINISH:
      return {
        isRemoving: false,
      };

    default:
      return state;
  }
}
