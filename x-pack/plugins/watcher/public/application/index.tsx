/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App, AppDeps } from './app';
import { setHttpClient } from './lib/api';
import { KibanaRenderContextProvider } from './shared_imports';

interface BootDeps extends AppDeps {
  element: HTMLElement;
}

export const renderApp = (bootDeps: BootDeps) => {
  const { element, ...appDeps } = bootDeps;

  setHttpClient(appDeps.http);

  render(
    <KibanaRenderContextProvider {...appDeps}>
      <KibanaContextProvider
        services={{
          uiSettings: bootDeps.uiSettings,
          settings: bootDeps.settings,
          theme: bootDeps.theme,
        }}
      >
        <App {...appDeps} />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
