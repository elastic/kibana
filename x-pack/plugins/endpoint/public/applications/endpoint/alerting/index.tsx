/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Route } from 'react-router-dom';
import { AlertingState, Immutable } from '../../../../common/alerts/types';
import { SubpluginProviderDefinition } from '../types';
import { alertingReducer } from './store/reducer';
import { alertMiddlewareFactory } from './store/middleware';
import { AlertIndex } from './view';

export const alertingSelectorContext = React.createContext<Immutable<AlertingState> | undefined>(
  undefined
);

export const alertingSubprovider: SubpluginProviderDefinition<AlertingState> = {
  reducer: alertingReducer,
  middleware: (coreStart, depsStart) => alertMiddlewareFactory(coreStart, depsStart),
  Routes: () => () => <Route path="/alerts" component={AlertIndex} />,
  SelectorContextProvider: alertingSelectorContext.Provider,
};
