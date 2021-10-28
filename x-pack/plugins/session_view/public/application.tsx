/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { I18nProvider } from '@kbn/i18n/react';
import { EuiErrorBoundary } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from 'kibana/public';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../src/plugins/kibana_react/common';

import type { SessionViewConfigType } from './types';
import { Application } from './components/Application';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DependencyServices {}

interface RenderAppProps {
  coreStart: CoreStart;
  depsServices: DependencyServices;
  appMountParams: AppMountParameters;
  version: string;
  config: SessionViewConfigType;
}

// Initializing react-query
const queryClient = new QueryClient();

export const renderApp = (props: RenderAppProps) => {
  const { coreStart, depsServices, appMountParams, version, config } = props;

  const { element, history } = appMountParams;

  const renderSessionViewApp = () => {
    const services = {
      ...coreStart,
      ...depsServices,
      version,
    };

    return (
      <KibanaContextProvider services={services}>
        <Router history={history}>
          <EuiErrorBoundary>
            <I18nProvider>
              <EuiThemeProvider>
                <QueryClientProvider client={queryClient}>
                  <Application />
                  <ReactQueryDevtools initialIsOpen={false} />
                </QueryClientProvider>
              </EuiThemeProvider>
            </I18nProvider>
          </EuiErrorBoundary>
        </Router>
      </KibanaContextProvider>
    );
  };

  // Mount the application
  ReactDOM.render(renderSessionViewApp(), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
