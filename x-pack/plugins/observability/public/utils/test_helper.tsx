/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render as testLibRender } from '@testing-library/react';
import { AppMountContext } from 'kibana/public';
import { of } from 'rxjs';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { PluginContext } from '../context/plugin_context';
import { EuiThemeProvider } from '../typings';
import { ObsvSharedContextProvider } from '../context/shared_data';

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
} as unknown) as AppMountContext['core'];

export const render = (component: React.ReactNode) => {
  const history = createMemoryHistory();
  return testLibRender(
    <PluginContext.Provider value={{ core }}>
      <KibanaContextProvider services={{ ...core }}>
        <EuiThemeProvider>
          <ObsvSharedContextProvider>
            <Router history={history}>{component}</Router>
          </ObsvSharedContextProvider>
        </EuiThemeProvider>
      </KibanaContextProvider>
    </PluginContext.Provider>
  );
};
