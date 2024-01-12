/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';
import SemVer from 'semver/classes/semver';

import { CoreStart, CoreSetup, ApplicationStart } from '@kbn/core/public';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { API_BASE_PATH } from '../../common';
import {
  createKibanaReactContext,
  GlobalFlyout,
  useKibana as useKibanaReactPlugin,
} from '../shared_imports';

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

  const { docLinks, notifications, application, executionContext, overlays, theme } = core;
  const { services, history, setBreadcrumbs, uiSettings, settings, kibanaVersion } = dependencies;

  // theme is required by the CodeEditor component used to edit runtime field Painless scripts.
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<KibanaReactContextServices>({
      application,
      uiSettings,
      settings,
      kibanaVersion: {
        get: () => kibanaVersion,
      },
      theme,
    });

  const componentTemplateProviderValues = {
    httpClient: services.httpService.httpClient,
    overlays,
    apiBasePath: API_BASE_PATH,
    trackMetric: services.uiMetricService.trackMetric.bind(services.uiMetricService),
    docLinks,
    toasts: notifications.toasts,
    setBreadcrumbs,
    getUrlForApp: application.getUrlForApp,
    executionContext,
  };

  render(
    <KibanaRenderContextProvider {...core}>
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
    </KibanaRenderContextProvider>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};

interface KibanaReactContextServices {
  application: ApplicationStart;
  uiSettings: CoreSetup['uiSettings'];
  settings: CoreSetup['settings'];
  kibanaVersion: {
    get: () => SemVer;
  };
  theme: CoreStart['theme'];
}

// We override useKibana() from the react plugin to return a typed version for this app
const useKibana = () => {
  return useKibanaReactPlugin<KibanaReactContextServices>();
};

export type { AppDependencies };
export { useKibana };
