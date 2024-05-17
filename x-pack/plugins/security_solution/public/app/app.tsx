/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { FC } from 'react';
import React, { memo } from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import type { Action, Store } from 'redux';

import type { AppMountParameters } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { CellActionsProvider } from '@kbn/cell-actions';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { APP_NAME } from '../../common/constants';
import { AssistantProvider } from '../assistant/provider';
import { DiscoverInTimelineContextProvider } from '../common/components/discover_in_timeline/provider';
import { ErrorToastDispatcher } from '../common/components/error_toast_dispatcher';
import { MlCapabilitiesProvider } from '../common/components/ml/permissions/ml_capabilities_provider';
import { GlobalToaster, ManageGlobalToaster } from '../common/components/toasters';
import { UpsellingProvider } from '../common/components/upselling_provider';
import { UserPrivilegesProvider } from '../common/components/user_privileges/user_privileges_context';
import { ReactQueryClientProvider } from '../common/containers/query_client/query_client_provider';
import { KibanaContextProvider, useDarkMode, useKibana } from '../common/lib/kibana';
import type { State } from '../common/store';
import { ManageUserInfo } from '../detections/components/user_info';
import type { StartServices } from '../types';
import { PageRouter } from './routes';

interface StartAppComponent {
  children: React.ReactNode;
  history: History;
  store: Store<State, Action>;
  theme$: AppMountParameters['theme$'];
}

const StartAppComponent: FC<StartAppComponent> = ({ children, history, store, theme$ }) => {
  const services = useKibana().services;
  const {
    application: { capabilities },
    uiActions,
    upselling,
  } = services;

  const darkMode = useDarkMode();

  return (
    <KibanaRenderContextProvider {...services}>
      <ManageGlobalToaster>
        <ReduxStoreProvider store={store}>
          <EuiThemeProvider darkMode={darkMode}>
            <MlCapabilitiesProvider>
              <UserPrivilegesProvider kibanaCapabilities={capabilities}>
                <ManageUserInfo>
                  <NavigationProvider core={services}>
                    <ReactQueryClientProvider>
                      <CellActionsProvider
                        getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}
                      >
                        <UpsellingProvider upsellingService={upselling}>
                          <DiscoverInTimelineContextProvider>
                            <AssistantProvider>
                              <PageRouter history={history}>{children}</PageRouter>
                            </AssistantProvider>
                          </DiscoverInTimelineContextProvider>
                        </UpsellingProvider>
                      </CellActionsProvider>
                    </ReactQueryClientProvider>
                  </NavigationProvider>
                </ManageUserInfo>
              </UserPrivilegesProvider>
            </MlCapabilitiesProvider>
          </EuiThemeProvider>
          <ErrorToastDispatcher />
          <GlobalToaster />
        </ReduxStoreProvider>
      </ManageGlobalToaster>
    </KibanaRenderContextProvider>
  );
};

const StartApp = memo(StartAppComponent);

interface SecurityAppComponentProps {
  children: React.ReactNode;
  history: History;
  services: StartServices;
  store: Store<State, Action>;
  theme$: AppMountParameters['theme$'];
}

const SecurityAppComponent: React.FC<SecurityAppComponentProps> = ({
  children,
  history,
  services,
  store,
  theme$,
}) => {
  const CloudProvider = services.cloud?.CloudContextProvider ?? React.Fragment;

  return (
    <KibanaContextProvider
      services={{
        appName: APP_NAME,
        ...services,
      }}
    >
      <CloudProvider>
        <StartApp history={history} store={store} theme$={theme$}>
          {children}
        </StartApp>
      </CloudProvider>
    </KibanaContextProvider>
  );
};

export const SecurityApp = memo(SecurityAppComponent);
