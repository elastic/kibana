/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from 'kibana/public';
import { AppAction } from '../actions/app';

interface AppState {
  coreStartServices: null | CoreStart;
  appBasePath: string;
}

const createAppState = (): AppState => {
  return {
    appBasePath: '',
    coreStartServices: null,
  };
};

export const appReducer = (state: AppState = createAppState(), action: AppAction) => {
  switch (action.type) {
    case 'appWillMount':
      const { coreStartServices, appBasePath } = action.payload;
      return { ...state, coreStartServices, appBasePath };

    case 'appDidUnmount':
      return createAppState();

    default:
      return state;
  }
};
