/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { get } from 'lodash';

export const createInitialDataSelector = initialData => {
  return createSelector(
    state => state,
    state => {
      return {
        ...state,
        data: get(state, 'data') || initialData
      };
    }
  );
};
