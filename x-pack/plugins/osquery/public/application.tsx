/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { ThemeProvider } from 'styled-components';

import { useUiSetting$ } from '../../../../src/plugins/kibana_react/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { OsqueryApp } from './components/app';
import { DEFAULT_DARK_MODE, PLUGIN_NAME } from '../common';
import { KibanaContextProvider } from './common/lib/kibana';

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
  { element, history }: AppMountParameters,
  storage: Storage,
  kibanaVersion: string
) => {
  ReactDOM.render(
    <KibanaContextProvider
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      services={{
        appName: PLUGIN_NAME,
        ...core,
        ...services,
        storage,
      }}
    >
      <EuiErrorBoundary>
        <Router history={history}>
          <I18nProvider>
            <OsqueryAppContext />
          </I18nProvider>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
