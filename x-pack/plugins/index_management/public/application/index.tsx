/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '../../../../../src/core/public';

import { API_BASE_PATH } from '../../common';
import { createKibanaReactContext, GlobalFlyout } from '../shared_imports';

import { AppContextProvider, AppDependencies } from './app_context';
import { App } from './app';
import { indexManagementStore } from './store';
import { ComponentTemplatesProvider, MappingsEditorProvider } from './components';

const { GlobalFlyoutProvider } = GlobalFlyout;

export const renderApp = (
  elem: HTMLElement | null,
  { core, dependencies }: { core: CoreStart; dependencies: AppDependencies }
) => {
  if (!elem) {
    return () => undefined;
  }

  const { i18n, docLinks, notifications, application } = core;
  const { Context: I18nContext } = i18n;
  const { services, history, setBreadcrumbs, uiSettings } = dependencies;

  // uiSettings is required by the CodeEditor component used to edit runtime field Painless scripts.
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });

  const componentTemplateProviderValues = {
    httpClient: services.httpService.httpClient,
    apiBasePath: API_BASE_PATH,
    trackMetric: services.uiMetricService.trackMetric.bind(services.uiMetricService),
    docLinks,
    toasts: notifications.toasts,
    setBreadcrumbs,
    getUrlForApp: application.getUrlForApp,
  };

  render(
    <I18nContext>
      <KibanaReactContextProvider>
        <Provider store={indexManagementStore(services)}>
          <AppContextProvider value={dependencies}>
            <MappingsEditorProvider>
              <ComponentTemplatesProvider value={componentTemplateProviderValues}>
                <GlobalFlyoutProvider>
                  <App history={history} />
                </GlobalFlyoutProvider>
              </ComponentTemplatesProvider>
            </MappingsEditorProvider>
          </AppContextProvider>
        </Provider>
      </KibanaReactContextProvider>
    </I18nContext>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};

export { AppDependencies };
