/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { Route } from 'react-router-dom';
import { Immutable } from '../../../../common/types';
import { SubpluginProviderDefinition, PolicyListState } from '../types';
import { policyListMiddlewareFactory, policyListReducer } from '../store/policy_list';
import { PolicyList } from '../view/policy';
import { AppRootProvider } from '../view/app_root_provider';
import { RouteCapture } from '../view/route_capture';

export const policyListSelectorContext = React.createContext<
  Immutable<PolicyListState> | undefined
>(undefined);

export const policyListSubprovider: SubpluginProviderDefinition<PolicyListState> = {
  reducer: policyListReducer,
  middleware: (coreStart, depsStart) => policyListMiddlewareFactory(coreStart, depsStart),
  Routes: () => () => (
    <AppRootProvider>
      <RouteCapture>
        <Route path="/policy" exact component={PolicyList} />
      </RouteCapture>
    </AppRootProvider>
  ),
  SelectorContextProvider: policyListSelectorContext.Provider,
};
