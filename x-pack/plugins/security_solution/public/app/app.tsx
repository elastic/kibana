/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React, { memo, useMemo, FC } from 'react';
import { ApolloProvider } from 'react-apollo';
import { Store, Action } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { EuiErrorBoundary } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { DEFAULT_DARK_MODE, APP_NAME } from '../../common/constants';
import { ErrorToastDispatcher } from '../common/components/error_toast_dispatcher';
import { MlCapabilitiesProvider } from '../common/components/ml/permissions/ml_capabilities_provider';
import { GlobalToaster, ManageGlobalToaster } from '../common/components/toasters';
import { AppFrontendLibs } from '../common/lib/lib';
import { KibanaContextProvider, useKibana, useUiSetting$ } from '../common/lib/kibana';
import { State } from '../common/store';

import { ApolloClientContext } from '../common/utils/apollo_context';
import { ManageGlobalTimeline } from '../timelines/components/manage_timeline';
import { StartServices } from '../types';
import { PageRouter } from './routes';

interface StartAppComponent extends AppFrontendLibs {
  children: React.ReactNode;
  history: History;
  store: Store<State, Action>;
}

const StartAppComponent: FC<StartAppComponent> = ({ children, apolloClient, history, store }) => {
  const { i18n } = useKibana().services;

  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
  const theme = useMemo(
    () => ({
      eui: darkMode ? euiDarkVars : euiLightVars,
      darkMode,
    }),
    [darkMode]
  );

  return (
    <EuiErrorBoundary>
      <i18n.Context>
        <ManageGlobalToaster>
          <ManageGlobalTimeline>
            <ReduxStoreProvider store={store}>
              <ApolloProvider client={apolloClient}>
                <ApolloClientContext.Provider value={apolloClient}>
                  <ThemeProvider theme={theme}>
                    <MlCapabilitiesProvider>
                      <PageRouter history={history}>{children}</PageRouter>
                    </MlCapabilitiesProvider>
                  </ThemeProvider>
                  <ErrorToastDispatcher />
                  <GlobalToaster />
                </ApolloClientContext.Provider>
              </ApolloProvider>
            </ReduxStoreProvider>
          </ManageGlobalTimeline>
        </ManageGlobalToaster>
      </i18n.Context>
    </EuiErrorBoundary>
  );
};

const StartApp = memo(StartAppComponent);

interface SecurityAppComponentProps extends AppFrontendLibs {
  children: React.ReactNode;
  history: History;
  services: StartServices;
  store: Store<State, Action>;
}

const SecurityAppComponent: React.FC<SecurityAppComponentProps> = ({
  children,
  apolloClient,
  history,
  services,
  store,
}) => (
  <KibanaContextProvider
    services={{
      appName: APP_NAME,
      ...services,
    }}
  >
    <StartApp apolloClient={apolloClient} history={history} store={store}>
      {children}
    </StartApp>
  </KibanaContextProvider>
);

export const SecurityApp = memo(SecurityAppComponent);
