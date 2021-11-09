/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import React, { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '../../../../../../src/core/public';
import { createKibanaReactContext } from '../../../../../../src/plugins/kibana_react/public';
import { PluginContext, PluginContextValue } from '../../context/plugin_context';
import { LandingPage } from './';

export default {
  title: 'app/Landing',
  component: LandingPage,
  decorators: [
    (Story: ComponentType) => {
      const KibanaReactContext = createKibanaReactContext({
        application: { getUrlForApp: () => '', navigateToUrl: () => {} },
        chrome: { docTitle: { change: () => {} }, setBreadcrumbs: () => {} },
        uiSettings: { get: () => true },
        observability: { ObservabilityPageTemplate: EuiPageTemplate },
      } as unknown as Partial<CoreStart>);

      const pluginContextValue = {
        appMountParameters: { setHeaderActionMenu: () => {} },
        core: {
          http: {
            basePath: {
              prepend: () => '',
            },
          },
        },
        ObservabilityPageTemplate: EuiPageTemplate,
      } as unknown as PluginContextValue;

      return (
        <MemoryRouter>
          <KibanaReactContext.Provider>
            <PluginContext.Provider value={pluginContextValue}>
              <Story />
            </PluginContext.Provider>
          </KibanaReactContext.Provider>
        </MemoryRouter>
      );
    },
  ],
};

export function Example() {
  return <LandingPage />;
}
