/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, CoreStart } from 'kibana/public';
import { Main } from './components/main';
import { createKibanaReactContext } from '../../../../../src/plugins/kibana_react/public';

interface AppDependencies {
  http: CoreSetup['http'];
  I18nContext: CoreStart['i18n']['Context'];
  uiSettings: CoreSetup['uiSettings'];
}

export function renderApp(
  element: HTMLElement | null,
  { http, I18nContext, uiSettings }: AppDependencies
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
        <Main http={http} />
      </KibanaReactContextProvider>
    </I18nContext>,
    element
  );
  return () => unmountComponentAtNode(element);
}
