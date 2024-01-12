/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  I18nStart,
  ScopedHistory,
  ApplicationStart,
  UnmountCallback,
  ThemeServiceStart,
} from '@kbn/core/public';
import { DocLinksStart, ExecutionContextStart } from '@kbn/core/public';

import {
  CloudSetup,
  ILicense,
  KibanaContextProvider,
  APP_WRAPPER_CLASS,
  RedirectAppLinks,
  KibanaRenderContextProvider,
} from '../shared_imports';
import { App } from './app';
import { BreadcrumbService } from './services/breadcrumbs';

export const renderApp = (
  element: Element,
  i18n: I18nStart,
  history: ScopedHistory,
  application: ApplicationStart,
  breadcrumbService: BreadcrumbService,
  license: ILicense,
  theme: ThemeServiceStart,
  docLinks: DocLinksStart,
  executionContext: ExecutionContextStart,
  cloud?: CloudSetup
): UnmountCallback => {
  const { getUrlForApp } = application;
  render(
    <KibanaRenderContextProvider {...{ theme, i18n }}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application,
          }}
        >
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
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
};
