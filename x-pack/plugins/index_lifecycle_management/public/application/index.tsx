/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nStart, ScopedHistory, ApplicationStart, DocLinksStart } from 'kibana/public';
import { UnmountCallback } from 'src/core/public';
import { CloudSetup } from '../../../cloud/public';
import { ILicense } from '../../../licensing/public';

import { KibanaContextProvider, APP_WRAPPER_CLASS } from '../shared_imports';

import { App } from './app';

import { BreadcrumbService } from './services/breadcrumbs';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';

export const renderApp = (
  element: Element,
  I18nContext: I18nStart['Context'],
  history: ScopedHistory,
  application: ApplicationStart,
  breadcrumbService: BreadcrumbService,
  license: ILicense,
  docLinks: DocLinksStart,
  cloud?: CloudSetup
): UnmountCallback => {
  const { getUrlForApp } = application;
  render(
    <RedirectAppLinks application={application} className={APP_WRAPPER_CLASS}>
      <I18nContext>
        <KibanaContextProvider
          services={{ cloud, breadcrumbService, license, getUrlForApp, docLinks }}
        >
          <App history={history} />
        </KibanaContextProvider>
      </I18nContext>
    </RedirectAppLinks>,
    element
  );

  return () => unmountComponentAtNode(element);
};
