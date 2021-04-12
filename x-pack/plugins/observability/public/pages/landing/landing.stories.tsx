/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';
import { PluginContext, PluginContextValue } from '../../context/plugin_context';
import { LandingPage } from './';

export default {
  title: 'app/Landing',
  component: LandingPage,
  decorators: [
    (Story: ComponentType) => {
      const pluginContextValue = ({
        appMountParameters: { setHeaderActionMenu: () => {} },
        core: {
          http: {
            basePath: {
              prepend: () => '',
            },
          },
        },
      } as unknown) as PluginContextValue;
      return (
        <PluginContext.Provider value={pluginContextValue}>
          <EuiThemeProvider>
            <Story />
          </EuiThemeProvider>
        </PluginContext.Provider>
      );
    },
  ],
};

export function Example() {
  return <LandingPage />;
}
