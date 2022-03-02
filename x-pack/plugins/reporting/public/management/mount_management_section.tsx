/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';
import { CoreSetup, CoreStart } from 'src/core/public';
import { ILicense } from '../../../licensing/public';
import { ReportingAPIClient, InternalApiClientProvider } from '../lib/reporting_api_client';
import { IlmPolicyStatusContextProvider } from '../lib/ilm_policy_status_context';
import { ClientConfigType } from '../plugin';
import type { ManagementAppMountParams, SharePluginSetup } from '../shared_imports';
import { KibanaContextProvider } from '../shared_imports';
import { ReportListing } from '.';

export async function mountManagementSection(
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  license$: Observable<ILicense>,
  pollConfig: ClientConfigType['poll'],
  apiClient: ReportingAPIClient,
  urlService: SharePluginSetup['url'],
  params: ManagementAppMountParams
) {
  render(
    <I18nProvider>
      <KibanaContextProvider
        services={{
          http: coreSetup.http,
          application: coreStart.application,
          uiSettings: coreStart.uiSettings,
        }}
      >
        <InternalApiClientProvider apiClient={apiClient}>
          <IlmPolicyStatusContextProvider>
            <ReportListing
              toasts={coreSetup.notifications.toasts}
              license$={license$}
              pollConfig={pollConfig}
              redirect={coreStart.application.navigateToApp}
              navigateToUrl={coreStart.application.navigateToUrl}
              urlService={urlService}
            />
          </IlmPolicyStatusContextProvider>
        </InternalApiClientProvider>
      </KibanaContextProvider>
    </I18nProvider>,
    params.element
  );

  return () => {
    unmountComponentAtNode(params.element);
  };
}
