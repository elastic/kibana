/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { DocLinksStart, ToastsSetup, HttpSetup, FatalErrorsSetup } from 'src/core/public';

import { App } from './app';
import { indexLifecycleManagementStore } from './store';
import { init as initHttp } from './services/http';
import { init as initNavigation } from './services/navigation';
import { init as initDocumentation } from './services/documentation';
import { init as initUiMetric } from './services/ui_metric';
import { init as initNotification } from './services/notification';

export interface LegacySetup {
  redirect: any;
  createUiStatsReporter: any;
}

interface AppDependencies {
  legacy: LegacySetup;
  I18nContext: any;
  http: HttpSetup;
  toasts: ToastsSetup;
  fatalErrors: FatalErrorsSetup;
  docLinks: DocLinksStart;
  element: HTMLElement;
}

export const renderApp = (appDependencies: AppDependencies) => {
  const {
    legacy: { redirect, createUiStatsReporter },
    I18nContext,
    http,
    toasts,
    fatalErrors,
    docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
    element,
  } = appDependencies;

  // Initialize services
  initHttp(http);
  initNavigation(redirect);
  initDocumentation(`${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`);
  initUiMetric(createUiStatsReporter);
  initNotification(toasts, fatalErrors);

  render(
    <I18nContext>
      <Provider store={indexLifecycleManagementStore()}>
        <App />
      </Provider>
    </I18nContext>,
    element
  );

  return () => unmountComponentAtNode(element);
};
