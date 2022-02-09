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
} from '../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider as StyledComponentsThemeProvider } from '../../../../src/plugins/kibana_react/common';
import { RenderAppProps } from './types';
import { getCasesLazy } from './methods';
import { APP_OWNER } from '../common/constants';

export const renderApp = (deps: RenderAppProps) => {
  const { mountParams } = deps;
  const { element } = mountParams;

  ReactDOM.render(<App deps={deps} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

const CasesApp = () => {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return (
    <StyledComponentsThemeProvider darkMode={darkMode}>
      {getCasesLazy({
        owner: [APP_OWNER],
        useFetchAlertData: () => [false, {}],
        userCanCrud: true,
        basePath: '/',
      })}
    </StyledComponentsThemeProvider>
  );
};

CasesApp.displayName = 'CasesApp';

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
              <CasesApp />
            </Router>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nProvider>
    </EuiErrorBoundary>
  );
};

App.displayName = 'App';
