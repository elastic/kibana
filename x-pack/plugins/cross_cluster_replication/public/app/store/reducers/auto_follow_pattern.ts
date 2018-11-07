/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { Actions } from '../actions/auto_follow_pattern';

export interface AutoFollowPatternState {
  byId: object;
  selectedId: string | null;
}

const initialState: AutoFollowPatternState = {
  byId: {},
  selectedId: null,
};

export const reducer = (state = initialState, action: Actions) => {
  switch (action.type) {
    case t.AUTO_FOLLOW_PATTERN_LOAD_SUCCESS: {
      return state;
    }
    default:
      return state;
  }
};
