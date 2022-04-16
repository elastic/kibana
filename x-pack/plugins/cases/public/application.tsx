/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiErrorBoundary } from '@elastic/eui';

import {
  KibanaContextProvider,
  KibanaThemeProvider,
  useUiSetting$,
} from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider as StyledComponentsThemeProvider } from '@kbn/kibana-react-plugin/common';
import { RenderAppProps } from './types';
import { CasesApp } from './components/app';

export const renderApp = (deps: RenderAppProps) => {
  const { mountParams } = deps;
  const { element } = mountParams;

  ReactDOM.render(<App deps={deps} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const CasesAppWithContext = () => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <StyledComponentsThemeProvider darkMode={darkMode}>
      <CasesApp />
    </StyledComponentsThemeProvider>
  );
};

CasesAppWithContext.displayName = 'CasesAppWithContext';

export const App: React.FC<{ deps: RenderAppProps }> = ({ deps }) => {
  const { mountParams, coreStart, pluginsStart, storage, kibanaVersion } = deps;
  const { history, theme$ } = mountParams;

  return (
    <EuiErrorBoundary>
      <I18nProvider>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              kibanaVersion,
              ...coreStart,
              ...pluginsStart,
              storage,
            }}
          >
            <Router history={history}>
              <CasesAppWithContext />
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nProvider>
    </EuiErrorBoundary>
  );
};

App.displayName = 'App';
