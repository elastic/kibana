/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ChromeBreadcrumb } from 'src/core/public';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

import { App } from './app';
import { DocumentationService, UiMetricService, ApiService } from './services';

export interface AppServices {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  metric: UiMetricService;
  documentation: DocumentationService;
  api: ApiService;
}

export const renderApp = (
  element: HTMLElement,
  I18nContext: ({ children }: { children: ReactNode }) => JSX.Element,
  services: AppServices
) => {
  render(
    <I18nContext>
      <KibanaContextProvider services={services}>
        <App />
      </KibanaContextProvider>
    </I18nContext>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
