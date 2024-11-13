/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { InventoryStartDependencies } from './types';
import { InventoryServices } from './services/types';
import { AppRoot } from './components/app_root';
import { KibanaEnvironment } from './hooks/use_kibana';

export const renderApp = (props: {
  coreStart: CoreStart;
  pluginsStart: InventoryStartDependencies;
  services: InventoryServices;
  appMountParameters: AppMountParameters;
  kibanaEnvironment: KibanaEnvironment;
}) => {
  const { appMountParameters, coreStart } = props;
  const { element } = appMountParameters;

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <AppRoot {...props} />
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
