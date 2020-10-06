/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render as testLibRender } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import { of } from 'rxjs';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { PluginContext } from '../context/plugin_context';
import { EuiThemeProvider } from '../typings';
import { HasDataContextProvider } from '../context/has_data_context';
import { ObservabilityPluginSetupDeps } from '../plugin';

export const core = ({
  http: {
    basePath: {
      prepend: jest.fn(),
    },
  },
  uiSettings: {
    get: (key: string) => true,
    get$: (key: string) => of(true),
  },
} as unknown) as CoreStart;

const plugins = ({
  data: { query: { timefilter: { timefilter: { setTime: jest.fn() } } } },
} as unknown) as ObservabilityPluginSetupDeps;

export const render = (component: React.ReactNode) => {
  const history = createMemoryHistory();
  return testLibRender(
    <PluginContext.Provider value={{ core, plugins }}>
      <KibanaContextProvider services={{ ...core }}>
        <EuiThemeProvider>
          <HasDataContextProvider>
            <Router history={history}>{component}</Router>
          </HasDataContextProvider>
        </EuiThemeProvider>
      </KibanaContextProvider>
    </PluginContext.Provider>
  );
};
