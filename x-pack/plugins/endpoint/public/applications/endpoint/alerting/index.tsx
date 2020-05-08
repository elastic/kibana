/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Route } from 'react-router-dom';
import { AlertingState, Immutable } from '../../../../common/alerting/types';
import { SubpluginProviderDefinition } from '../types';
import { alertingReducer } from './store/reducer';
import { alertMiddlewareFactory } from './store/middleware';
import { AlertIndex } from './view';
import { AppRootProvider } from '../view/app_root_provider';
import { RouteCapture } from '../view/route_capture';
import { HeaderNavigation } from '../view/components/header_navigation';

export const alertingSelectorContext = React.createContext<Immutable<AlertingState> | undefined>(
  undefined
);

export const alertingSubprovider: SubpluginProviderDefinition<AlertingState> = {
  reducer: alertingReducer,
  middleware: (coreStart, depsStart) => alertMiddlewareFactory(coreStart, depsStart),
  Routes: () => () => {
    // TODO: Header Nav needs to be put under each subplugin happy monday
    return (
      <AppRootProvider>
        <RouteCapture>
          <HeaderNavigation />
          <Route path="/alerts" component={AlertIndex} />
        </RouteCapture>
      </AppRootProvider>
    );
  },
  SelectorContextProvider: alertingSelectorContext.Provider,
};
