/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render as testLibRender } from '@testing-library/react';
import { AppMountContext } from 'kibana/public';
import { PluginContext } from '../context/plugin_context';
import { EuiThemeProvider } from '../typings';

export const core = ({
  http: {
    basePath: {
      prepend: jest.fn(),
    },
  },
} as unknown) as AppMountContext['core'];

export const render = (component: React.ReactNode) => {
  return testLibRender(
    <PluginContext.Provider value={{ core }}>
      <EuiThemeProvider>{component}</EuiThemeProvider>
    </PluginContext.Provider>
  );
};
