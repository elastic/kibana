/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { createSelector } from 'reselect';

export function createInitialDataSelector<T>(initialData: T) {
  return createSelector(
    state => state,
    state => {
      const data: T = get(state, 'data') || initialData;
      return { ...state, data };
    }
  );
}
