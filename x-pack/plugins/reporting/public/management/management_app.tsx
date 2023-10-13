/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import type { Observable } from 'rxjs';

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { ILicense } from '@kbn/licensing-plugin/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

import { ReportListing } from '.';
import { IlmPolicyStatusContextProvider } from '../lib/ilm_policy_status_context';
import { InternalApiClientProvider, type ReportingAPIClient } from '../lib/reporting_api_client';
import type { ClientConfigType } from '../plugin';
import {
  KibanaContextProvider,
  type ManagementAppMountParams,
  type SharePluginSetup,
} from '../shared_imports';

interface ManagementAppProps {
  coreSetup: CoreSetup;
  coreStart: CoreStart;
  license$: Observable<ILicense>;
  config: ClientConfigType;
  apiClient: ReportingAPIClient;
  urlService: SharePluginSetup['url'];
  params: ManagementAppMountParams;
}

export const ManagementApp = (props: ManagementAppProps) => {
  const { apiClient, coreSetup, coreStart, license$, config, urlService, params } = props;
  return (
    <KibanaThemeProvider theme={{ theme$: params.theme$ }}>
      <I18nProvider>
        <KibanaContextProvider
          services={{
            http: coreSetup.http,
            application: coreStart.application,
            uiSettings: coreStart.uiSettings,
            docLinks: coreStart.docLinks,
          }}
        >
          <InternalApiClientProvider apiClient={apiClient}>
            <IlmPolicyStatusContextProvider>
              <ReportListing
                toasts={coreSetup.notifications.toasts}
                license$={license$}
                config={config}
                redirect={coreStart.application.navigateToApp}
                navigateToUrl={coreStart.application.navigateToUrl}
                urlService={urlService}
              />
            </IlmPolicyStatusContextProvider>
          </InternalApiClientProvider>
        </KibanaContextProvider>
      </I18nProvider>
    </KibanaThemeProvider>
  );
};
