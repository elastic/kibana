/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { CoreSetup, CoreStart, HttpSetup, ChromeStart, CoreTheme } from '@kbn/core/public';

import { createKibanaReactContext, KibanaThemeProvider } from '../shared_imports';

import { Links } from '../links';
import { AppContextProvider } from './context';
import { Main } from './components/main';

interface AppDependencies {
  http: HttpSetup;
  I18nContext: CoreStart['i18n']['Context'];
  uiSettings: CoreSetup['uiSettings'];
  links: Links;
  chrome: ChromeStart;
  theme$: Observable<CoreTheme>;
}

export function renderApp(
  element: HTMLElement | null,
  { http, I18nContext, uiSettings, links, chrome, theme$ }: AppDependencies
) {
  if (!element) {
    return () => undefined;
  }
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });
  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <KibanaReactContextProvider>
          <AppContextProvider value={{ http, links, chrome }}>
            <Main />
          </AppContextProvider>
        </KibanaReactContextProvider>
      </KibanaThemeProvider>
    </I18nContext>,
    element
  );
  return () => unmountComponentAtNode(element);
}
