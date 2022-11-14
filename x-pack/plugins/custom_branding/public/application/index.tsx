/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { CoreTheme } from '@kbn/core-theme-browser';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-browser';
import { App } from './app';

interface BootDeps {
  element: HTMLElement;
  savedObjects: SavedObjectsClientContract;
  I18nContext: any;
  theme$: Observable<CoreTheme>;
}

export const renderApp = (bootDeps: BootDeps) => {
  const { I18nContext, element, theme$ } = bootDeps;
  render(
    <I18nContext>
      <KibanaThemeProvider theme$={theme$}>
        <App />
      </KibanaThemeProvider>
    </I18nContext>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
