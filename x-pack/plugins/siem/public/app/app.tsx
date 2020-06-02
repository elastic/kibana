/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHashHistory, History } from 'history';
import React, { memo, useMemo, FC } from 'react';
import { ApolloProvider } from 'react-apollo';
import { Store } from 'redux';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { ThemeProvider } from 'styled-components';

import { EuiErrorBoundary } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { BehaviorSubject } from 'rxjs';
import { pluck } from 'rxjs/operators';

import { KibanaContextProvider, useKibana, useUiSetting$ } from '../common/lib/kibana';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

import { DEFAULT_DARK_MODE } from '../../common/constants';
import { ErrorToastDispatcher } from '../common/components/error_toast_dispatcher';
import { compose } from '../common/lib/compose/kibana_compose';
import { AppFrontendLibs, AppApolloClient } from '../common/lib/lib';
import { StartServices } from '../types';
import { PageRouter } from './routes';
import { createStore, createInitialState } from '../common/store';
import { GlobalToaster, ManageGlobalToaster } from '../common/components/toasters';
import { MlCapabilitiesProvider } from '../common/components/ml/permissions/ml_capabilities_provider';

import { ApolloClientContext } from '../common/utils/apollo_context';
import { SecuritySubPlugins } from './types';

interface AppPluginRootComponentProps {
  apolloClient: AppApolloClient;
  history: History;
  store: Store;
  subPluginRoutes: React.ReactElement[];
  theme: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const AppPluginRootComponent: React.FC<AppPluginRootComponentProps> = ({
  apolloClient,
  theme,
  store,
  subPluginRoutes,
  history,
}) => (
  <ManageGlobalToaster>
    <ReduxStoreProvider store={store}>
      <ApolloProvider client={apolloClient}>
        <ApolloClientContext.Provider value={apolloClient}>
          <ThemeProvider theme={theme}>
            <MlCapabilitiesProvider>
              <PageRouter history={history} subPluginRoutes={subPluginRoutes} />
            </MlCapabilitiesProvider>
          </ThemeProvider>
          <ErrorToastDispatcher />
          <GlobalToaster />
        </ApolloClientContext.Provider>
      </ApolloProvider>
    </ReduxStoreProvider>
  </ManageGlobalToaster>
);

const AppPluginRoot = memo(AppPluginRootComponent);

interface StartAppComponent extends AppFrontendLibs {
  subPlugins: SecuritySubPlugins;
}

const StartAppComponent: FC<StartAppComponent> = ({ subPlugins, ...libs }) => {
  const { routes: subPluginRoutes, store: subPluginsStore } = subPlugins;
  const { i18n } = useKibana().services;
  const history = createHashHistory();
  const libs$ = new BehaviorSubject(libs);

  const store = createStore(
    createInitialState(subPluginsStore.initialState),
    subPluginsStore.reducer,
    libs$.pipe(pluck('apolloClient')),
    subPluginsStore.middlewares
  );

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
        <AppPluginRoot
          apolloClient={libs.apolloClient}
          history={history}
          store={store}
          subPluginRoutes={subPluginRoutes}
          theme={theme}
        />
      </i18n.Context>
    </EuiErrorBoundary>
  );
};

const StartApp = memo(StartAppComponent);

interface SiemAppComponentProps {
  services: StartServices;
  subPlugins: SecuritySubPlugins;
}

const SiemAppComponent: React.FC<SiemAppComponentProps> = ({ services, subPlugins }) => (
  <KibanaContextProvider
    services={{
      appName: 'siem',
      storage: new Storage(localStorage),
      ...services,
    }}
  >
    <StartApp subPlugins={subPlugins} {...compose(services)} />
  </KibanaContextProvider>
);

export const SiemApp = memo(SiemAppComponent);
