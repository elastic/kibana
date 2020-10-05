/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render as testLibRender } from '@testing-library/react';
import { CoreStart } from 'kibana/public';
import { PluginContext } from '../context/plugin_context';
import { EuiThemeProvider } from '../typings';
import { ObservabilityPluginSetupDeps } from '../plugin';

export const core = ({
  http: {
    basePath: {
      prepend: jest.fn(),
    },
  },
} as unknown) as CoreStart;

const plugins = ({
  data: { query: { timefilter: { timefilter: { setTime: jest.fn() } } } },
} as unknown) as ObservabilityPluginSetupDeps;

export const render = (component: React.ReactNode) => {
  return testLibRender(
    <PluginContext.Provider value={{ core, plugins }}>
      <EuiThemeProvider>{component}</EuiThemeProvider>
    </PluginContext.Provider>
  );
};
