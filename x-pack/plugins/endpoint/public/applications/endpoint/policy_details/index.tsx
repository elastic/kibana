/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Route } from 'react-router-dom';
import { Immutable } from '../../../../common/types';
import { SubpluginProviderDefinition, PolicyDetailsState } from '../types';
import { policyDetailsMiddlewareFactory, policyDetailsReducer } from '../store/policy_details';
import { PolicyDetails } from '../view/policy';
import { AppRootProvider } from '../view/app_root_provider';
import { RouteCapture } from '../view/route_capture';

export const policyDetailsSelectorContext = React.createContext<
  Immutable<PolicyDetailsState> | undefined
>(undefined);

export const policyDetailsSubprovider: SubpluginProviderDefinition<PolicyDetailsState> = {
  reducer: policyDetailsReducer,
  middleware: (coreStart, depsStart) => policyDetailsMiddlewareFactory(coreStart, depsStart),
  Routes: () => () => (
    <AppRootProvider>
      <RouteCapture>
        <Route path="/policy/:id" exact component={PolicyDetails} />
      </RouteCapture>
    </AppRootProvider>
  ),
  SelectorContextProvider: policyDetailsSelectorContext.Provider,
};
