/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { APP_WRAPPER_CLASS, type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { css } from '@emotion/css';
import type { InventoryStartDependencies } from './types';
import { InventoryServices } from './services/types';
import { AppRoot } from './components/routing/root';

export const renderApp = ({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
}: {
  coreStart: CoreStart;
  pluginsStart: InventoryStartDependencies;
  services: InventoryServices;
} & { appMountParameters: AppMountParameters }) => {
  const { element, theme$ } = appMountParameters;

  const appWrapperClassName = css`
    overflow: auto;
  `;
  const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];
  appWrapperElement.classList.add(appWrapperClassName);

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaThemeProvider
        theme={{ theme$ }}
        modify={{
          breakpoint: {
            xxl: 1600,
            xxxl: 2000,
          },
        }}
      >
        <AppRoot
          appMountParameters={appMountParameters}
          coreStart={coreStart}
          pluginsStart={pluginsStart}
          services={services}
        />
      </KibanaThemeProvider>
    </KibanaRenderContextProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
    appWrapperElement.classList.remove(APP_WRAPPER_CLASS);
  };
};
