/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';

const initialState = {
  byId: {},
  selectedId: null,
};

const success = action => `${action}_SUCCESS`;

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case success(t.AUTO_FOLLOW_PATTERN_LOAD): {
      return state;
    }
    default:
      return state;
  }
};
