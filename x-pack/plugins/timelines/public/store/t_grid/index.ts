/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createStore } from 'redux';
export * from './model';
import * as tGridActions from './actions';
export * as tGridActions from './actions';
export * as tGridSelectors from './selectors';
export * from './types';
import { TGridProps, ReduxDeps } from '../../types';
import { initialTGridState, tGridReducer } from './reducer';

export const getReduxDeps = (type: TGridProps['type']): ReduxDeps => {
  if (type === 'embedded') {
    return {
      actions: tGridActions,
      initialState: initialTGridState,
      reducer: tGridReducer,
    };
  } else {
    return createStore(tGridReducer);
  }
};
