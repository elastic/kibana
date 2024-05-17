/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStart, CoreSetup, CoreStart, HttpSetup } from '@kbn/core/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { KibanaRenderContextProvider, createKibanaReactContext } from '../shared_imports';

import { Links } from '../links';
import { PainlessLabStartServices } from '../types';
import { Main } from './components/main';
import { AppContextProvider } from './context';

interface AppDependencies {
  http: HttpSetup;
  uiSettings: CoreSetup['uiSettings'];
  settings: CoreStart['settings'];
  links: Links;
  chrome: ChromeStart;
  startServices: PainlessLabStartServices;
}

export function renderApp(
  element: HTMLElement | null,
  { http, uiSettings, links, chrome, settings, startServices }: AppDependencies
) {
  if (!element) {
    return () => undefined;
  }
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
    settings,
  });
  render(
    <KibanaRenderContextProvider {...startServices}>
      <KibanaReactContextProvider>
        <AppContextProvider value={{ http, links, chrome }}>
          <Main />
        </AppContextProvider>
      </KibanaReactContextProvider>
    </KibanaRenderContextProvider>,

    element
  );
  return () => unmountComponentAtNode(element);
}
