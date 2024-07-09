/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import type { Store } from 'redux';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { UpsellingService } from '@kbn/security-solution-upselling/service';
import { UpsellingProvider } from '../upselling_provider';
import { UserPrivilegesProvider } from '../user_privileges/user_privileges_context';
import type { SecuritySolutionQueryClient } from '../../containers/query_client/query_client_provider';
import { ReactQueryClientProvider } from '../../containers/query_client/query_client_provider';
import { SecuritySolutionStartDependenciesContext } from '../user_privileges/endpoint/security_solution_start_dependencies';
import { CurrentLicense } from '../current_license';
import type { StartPlugins } from '../../../types';
import { useKibana } from '../../lib/kibana';

export type RenderContextProvidersProps = PropsWithChildren<{
  store: Store;
  depsStart: Pick<StartPlugins, 'data' | 'fleet'>;
  upsellingService: UpsellingService;
  queryClient?: SecuritySolutionQueryClient;
}>;

export const RenderContextProviders = memo<RenderContextProvidersProps>(
  ({ store, depsStart, queryClient, upsellingService, children }) => {
    const services = useKibana().services;
    const {
      application: { capabilities },
    } = services;
    return (
      <ReduxStoreProvider store={store}>
        <ReactQueryClientProvider queryClient={queryClient}>
          <SecuritySolutionStartDependenciesContext.Provider value={depsStart}>
            <UserPrivilegesProvider kibanaCapabilities={capabilities}>
              <NavigationProvider core={services}>
                <CurrentLicense>
                  <UpsellingProvider upsellingService={upsellingService}>
                    {children}
                  </UpsellingProvider>
                </CurrentLicense>
              </NavigationProvider>
            </UserPrivilegesProvider>
          </SecuritySolutionStartDependenciesContext.Provider>
        </ReactQueryClientProvider>
      </ReduxStoreProvider>
    );
  }
);
RenderContextProviders.displayName = 'RenderContextProviders';
