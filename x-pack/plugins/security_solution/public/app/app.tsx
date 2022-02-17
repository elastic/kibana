/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import React, { memo, FC } from 'react';
import { Store, Action } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';

import { EuiErrorBoundary } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from 'react-query';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { AppLeaveHandler, AppMountParameters } from '../../../../../src/core/public';

import { ManageUserInfo } from '../detections/components/user_info';
import { DEFAULT_DARK_MODE, APP_NAME } from '../../common/constants';
import { ErrorToastDispatcher } from '../common/components/error_toast_dispatcher';
import { MlCapabilitiesProvider } from '../common/components/ml/permissions/ml_capabilities_provider';
import { GlobalToaster, ManageGlobalToaster } from '../common/components/toasters';
import { KibanaContextProvider, useKibana, useUiSetting$ } from '../common/lib/kibana';
import { State } from '../common/store';

import { StartServices } from '../types';
import { PageRouter } from './routes';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { UserPrivilegesProvider } from '../common/components/user_privileges/user_privileges_context';

interface StartAppComponent {
  children: React.ReactNode;
  history: History;
  onAppLeave: (handler: AppLeaveHandler) => void;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  store: Store<State, Action>;
  theme$: AppMountParameters['theme$'];
}

const queryClient = new QueryClient();

const StartAppComponent: FC<StartAppComponent> = ({
  children,
  history,
  setHeaderActionMenu,
  onAppLeave,
  store,
  theme$,
}) => {
  const {
    i18n,
    application: { capabilities },
  } = useKibana().services;
  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);

  return (
    <EuiErrorBoundary>
      <i18n.Context>
        <ManageGlobalToaster>
          <ReduxStoreProvider store={store}>
            <KibanaThemeProvider theme$={theme$}>
              <EuiThemeProvider darkMode={darkMode}>
                <MlCapabilitiesProvider>
                  <UserPrivilegesProvider kibanaCapabilities={capabilities}>
                    <ManageUserInfo>
                      <QueryClientProvider client={queryClient}>
                        <PageRouter
                          history={history}
                          onAppLeave={onAppLeave}
                          setHeaderActionMenu={setHeaderActionMenu}
                        >
                          {children}
                        </PageRouter>
                      </QueryClientProvider>
                    </ManageUserInfo>
                  </UserPrivilegesProvider>
                </MlCapabilitiesProvider>
              </EuiThemeProvider>
            </KibanaThemeProvider>
            <ErrorToastDispatcher />
            <GlobalToaster />
          </ReduxStoreProvider>
        </ManageGlobalToaster>
      </i18n.Context>
    </EuiErrorBoundary>
  );
};

const StartApp = memo(StartAppComponent);

interface SecurityAppComponentProps {
  children: React.ReactNode;
  history: History;
  onAppLeave: (handler: AppLeaveHandler) => void;
  services: StartServices;
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  store: Store<State, Action>;
  theme$: AppMountParameters['theme$'];
}

const SecurityAppComponent: React.FC<SecurityAppComponentProps> = ({
  children,
  history,
  onAppLeave,
  services,
  setHeaderActionMenu,
  store,
  theme$,
}) => (
  <KibanaContextProvider
    services={{
      appName: APP_NAME,
      ...services,
    }}
  >
    <StartApp
      history={history}
      onAppLeave={onAppLeave}
      setHeaderActionMenu={setHeaderActionMenu}
      store={store}
      theme$={theme$}
    >
      {children}
    </StartApp>
  </KibanaContextProvider>
);

export const SecurityApp = memo(SecurityAppComponent);
