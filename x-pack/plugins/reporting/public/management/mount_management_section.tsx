/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ClientConfigType } from '@kbn/reporting-public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  InternalApiClientProvider,
  ReportingAPIClient,
  KibanaContext,
} from '@kbn/reporting-public';
import { ReportListing } from '.';
import { PolicyStatusContextProvider } from '../lib/default_status_context';

export async function mountManagementSection(
  coreStart: CoreStart,
  license$: LicensingPluginStart['license$'],
  dataService: DataPublicPluginStart,
  shareService: SharePluginStart,
  config: ClientConfigType,
  apiClient: ReportingAPIClient,
  params: ManagementAppMountParams
) {
  const services: KibanaContext = {
    http: coreStart.http,
    application: coreStart.application,
    uiSettings: coreStart.uiSettings,
    docLinks: coreStart.docLinks,
    data: dataService,
    share: shareService,
  };

  render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={services}>
        <InternalApiClientProvider apiClient={apiClient} http={coreStart.http}>
          <PolicyStatusContextProvider config={config}>
            <ReportListing
              apiClient={apiClient}
              toasts={coreStart.notifications.toasts}
              license$={license$}
              config={config}
              redirect={coreStart.application.navigateToApp}
              navigateToUrl={coreStart.application.navigateToUrl}
              urlService={shareService.url}
            />
          </PolicyStatusContextProvider>
        </InternalApiClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    params.element
  );

  return () => {
    unmountComponentAtNode(params.element);
  };
}
