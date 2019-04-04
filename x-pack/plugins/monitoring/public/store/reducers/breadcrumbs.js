/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { setBreadcrumbs } from '../actions';

const defaultState = [];

export const breadcrumbs = handleActions(
  {
    [setBreadcrumbs](_state, action) {
      const { breadcrumbs } = action.payload;
      return breadcrumbs;
    },
  },
  defaultState
);
