/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Route } from 'react-router-dom';
import { Immutable } from '../../../../common/types';
import { SubpluginProviderDefinition, HostState } from '../types';
import { hostMiddlewareFactory, hostListReducer } from '../store/hosts';
import { HostList } from '../view/hosts';
import { AppRootProvider } from '../view/app_root_provider';
import { RouteCapture } from '../view/route_capture';

export const hostsSelectorContext = React.createContext<Immutable<HostState> | undefined>(
  undefined
);

export const hostsSubprovider: SubpluginProviderDefinition<HostState> = {
  reducer: hostListReducer,
  middleware: (coreStart, depsStart) => hostMiddlewareFactory(coreStart, depsStart),
  Routes: () => () => (
    <AppRootProvider>
      <RouteCapture>
        <Route path="/hosts" component={HostList} />
      </RouteCapture>
    </AppRootProvider>
  ),
  SelectorContextProvider: hostsSelectorContext.Provider,
};
