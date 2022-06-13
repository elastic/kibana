/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import {
  I18nStart,
  ScopedHistory,
  ApplicationStart,
  UnmountCallback,
  CoreTheme,
} from 'src/core/public';
import { DocLinksStart, ExecutionContextStart } from 'kibana/public';

import {
  CloudSetup,
  ILicense,
  KibanaContextProvider,
  APP_WRAPPER_CLASS,
  RedirectAppLinks,
  KibanaThemeProvider,
} from '../shared_imports';
import { App } from './app';
import { BreadcrumbService } from './services/breadcrumbs';

export const renderApp = (
  element: Element,
  I18nContext: I18nStart['Context'],
  history: ScopedHistory,
  application: ApplicationStart,
  breadcrumbService: BreadcrumbService,
  license: ILicense,
  theme$: Observable<CoreTheme>,
  docLinks: DocLinksStart,
  executionContext: ExecutionContextStart,
  cloud?: CloudSetup
): UnmountCallback => {
  const { getUrlForApp } = application;
  render(
    <RedirectAppLinks application={application} className={APP_WRAPPER_CLASS}>
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              cloud,
              breadcrumbService,
              license,
              getUrlForApp,
              docLinks,
              executionContext,
            }}
          >
            <App history={history} />
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </RedirectAppLinks>,
    element
  );

  return () => unmountComponentAtNode(element);
};
