/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nStart, ScopedHistory, ApplicationStart } from 'kibana/public';
import { UnmountCallback } from 'src/core/public';
import { CloudSetup } from '../../../cloud/public';
import { ILicense } from '../../../licensing/public';

import { KibanaContextProvider } from '../shared_imports';

import { AppWithRouter } from './app';

import { BreadcrumbService } from './services/breadcrumbs';

export const renderApp = (
  element: Element,
  I18nContext: I18nStart['Context'],
  history: ScopedHistory,
  navigateToApp: ApplicationStart['navigateToApp'],
  getUrlForApp: ApplicationStart['getUrlForApp'],
  breadcrumbService: BreadcrumbService,
  license: ILicense,
  cloud?: CloudSetup
): UnmountCallback => {
  render(
    <I18nContext>
      <KibanaContextProvider services={{ cloud, breadcrumbService, license }}>
        <AppWithRouter
          history={history}
          navigateToApp={navigateToApp}
          getUrlForApp={getUrlForApp}
        />
      </KibanaContextProvider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};
