/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart } from 'kibana/public';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';

import { Links } from '../links';

import { AppContextProvider } from './context';
import { Main } from './components/main';

interface AppDependencies {
  http: CoreSetup['http'];
  I18nContext: CoreStart['i18n']['Context'];
  uiSettings: CoreSetup['uiSettings'];
  links: Links;
}

export function renderApp(
  element: HTMLElement | null,
  { http, I18nContext, uiSettings, links }: AppDependencies
) {
  if (!element) {
    return () => undefined;
  }

  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });
  render(
    <I18nContext>
      <KibanaReactContextProvider>
        <AppContextProvider value={{ http, links }}>
          <Main />
        </AppContextProvider>
      </KibanaReactContextProvider>
    </I18nContext>,
    element
  );
  return () => unmountComponentAtNode(element);
}
