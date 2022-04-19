/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { Store } from 'redux';
import type { QueryClient } from 'react-query';
import { ReactQueryClientProvider } from '../../../../../../common/containers/query_client/query_client_provider';
import { SecuritySolutionStartDependenciesContext } from '../../../../../../common/components/user_privileges/endpoint/security_solution_start_dependencies';
import { CurrentLicense } from '../../../../../../common/components/current_license';
import { StartPlugins } from '../../../../../../types';

export type RenderContextProvidersProps = PropsWithChildren<{
  store: Store;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  queryClient?: QueryClient;
}>;

export const RenderContextProviders = memo<RenderContextProvidersProps>(
  ({ store, depsStart, queryClient, children }) => {
    return (
      <ReduxStoreProvider store={store}>
        <ReactQueryClientProvider queryClient={queryClient}>
          <SecuritySolutionStartDependenciesContext.Provider value={depsStart}>
            <CurrentLicense>{children}</CurrentLicense>
          </SecuritySolutionStartDependenciesContext.Provider>
        </ReactQueryClientProvider>
      </ReduxStoreProvider>
    );
  }
);
RenderContextProviders.displayName = 'RenderContextProviders';
