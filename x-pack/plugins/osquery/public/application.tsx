/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { ThemeProvider } from 'styled-components';
import { QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import { useUiSetting$, KibanaThemeProvider } from './shared_imports';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { OsqueryApp } from './components/app';
import { DEFAULT_DARK_MODE, PLUGIN_NAME } from '../common';
import { KibanaContextProvider } from './common/lib/kibana';
import { queryClient } from './query_client';

const OsqueryAppContext = () => {
  const [darkMode] = useUiSetting$<boolean>(DEFAULT_DARK_MODE);
  const theme = useMemo(
    () => ({
      eui: darkMode ? euiDarkVars : euiLightVars,
      darkMode,
    }),
    [darkMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <OsqueryApp />
    </ThemeProvider>
  );
};

export const renderApp = (
  core: CoreStart,
  services: AppPluginStartDependencies,
  { element, history, theme$ }: AppMountParameters,
  storage: Storage,
  kibanaVersion: string
) => {
  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        services={{
          appName: PLUGIN_NAME,
          kibanaVersion,
          ...core,
          ...services,
          storage,
        }}
      >
        <EuiErrorBoundary>
          <Router history={history}>
            <I18nProvider>
              <QueryClientProvider client={queryClient}>
                <OsqueryAppContext />
                <ReactQueryDevtools initialIsOpen={false} />
              </QueryClientProvider>
            </I18nProvider>
          </Router>
        </EuiErrorBoundary>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
