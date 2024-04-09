/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from '@kbn/core/public';
import { wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { StartDependencies, AiAssistantManagementObservabilityPluginStart } from './plugin';
import { aIAssistantManagementObservabilityRouter } from './routes/config';
import { RedirectToHomeIfUnauthorized } from './routes/components/redirect_to_home_if_unauthorized';
import { AppContextProvider } from './context/app_context';

interface MountParams {
  core: CoreSetup<StartDependencies, AiAssistantManagementObservabilityPluginStart>;
  mountParams: ManagementAppMountParams;
}

export const mountManagementSection = async ({ core, mountParams }: MountParams) => {
  const [coreStart, startDeps] = await core.getStartServices();

  if (!startDeps.observabilityAIAssistant) return () => {};

  const { element, history, setBreadcrumbs } = mountParams;
  const { theme$ } = core.theme;

  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.observabilityAiAssistantManagement.app.titleBar', {
      defaultMessage: 'AI Assistant for Observability Settings',
    })
  );

  const queryClient = new QueryClient();

  ReactDOM.render(
    wrapWithTheme(
      <RedirectToHomeIfUnauthorized coreStart={coreStart}>
        <I18nProvider>
          <AppContextProvider
            value={{
              ...startDeps,
              application: coreStart.application,
              http: coreStart.http,
              notifications: coreStart.notifications,
              uiSettings: coreStart.uiSettings,
              settings: coreStart.settings,
              docLinks: coreStart.docLinks,
              setBreadcrumbs,
            }}
          >
            <QueryClientProvider client={queryClient}>
              <RouterProvider
                history={history}
                router={aIAssistantManagementObservabilityRouter as any}
              >
                <RouteRenderer />
              </RouterProvider>
            </QueryClientProvider>
          </AppContextProvider>
        </I18nProvider>
      </RedirectToHomeIfUnauthorized>,
      theme$
    ),
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
