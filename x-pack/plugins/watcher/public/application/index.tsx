/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { SavedObjectsClientContract, CoreTheme } from '@kbn/core/public';

import { KibanaThemeProvider } from './shared_imports';
import { App, AppDeps } from './app';
import { setHttpClient, setSavedObjectsClient } from './lib/api';

interface BootDeps extends AppDeps {
  element: HTMLElement;
  savedObjects: SavedObjectsClientContract;
  I18nContext: any;
  theme$: Observable<CoreTheme>;
}

export const renderApp = (bootDeps: BootDeps) => {
  const { I18nContext, element, savedObjects, theme$, ...appDeps } = bootDeps;

  setHttpClient(appDeps.http);
  setSavedObjectsClient(savedObjects);

  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <App {...appDeps} />
      </KibanaThemeProvider>
    </I18nContext>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
