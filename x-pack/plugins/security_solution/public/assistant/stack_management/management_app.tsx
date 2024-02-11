/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import { wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaErrorBoundaryProvider, KibanaErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { ManagementSettings } from './management_settings';
import { AssistantProvider } from '../provider';
import { KibanaContextProvider } from '../../common/lib/kibana';

interface MountParams {
  core: CoreSetup<{}, {}>;
  mountParams: ManagementAppMountParams;
}

export const renderManagementApp = async ({
  element,
  services,
  coreStart,
  theme$,
}: MountParams) => {
  coreStart.chrome.docTitle.change(
    i18n.translate('xpack.securitySolution.aiAssistantManagementSecurity.app.titleBar', {
      defaultMessage: 'AI Assistant for Security Settings',
    })
  );

  const queryClient = new QueryClient();

  ReactDOM.render(
    wrapWithTheme(
      <KibanaErrorBoundaryProvider analytics={services.analytics}>
        <KibanaErrorBoundary>
          {/* <RedirectToHomeIfUnauthorized services={services}> */}
          <I18nProvider>
            <KibanaContextProvider services={services}>
              <QueryClientProvider client={queryClient}>
                <EuiThemeProvider>
                  <AssistantProvider>
                    <ManagementSettings />
                  </AssistantProvider>
                </EuiThemeProvider>
              </QueryClientProvider>
            </KibanaContextProvider>
          </I18nProvider>
          {/* </RedirectToHomeIfUnauthorized> */}
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryProvider>,
      theme$
    ),
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
