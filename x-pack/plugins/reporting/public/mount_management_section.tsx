/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { CoreSetup, CoreStart } from 'src/core/public';
import { Observable } from 'rxjs';
import { ReportListing } from './components/report_listing';
import { ManagementAppMountParams } from '../../../../src/plugins/management/public';
import { ILicense } from '../../licensing/public';
import { ClientConfigType } from './plugin';
import { ReportingAPIClient } from './lib/reporting_api_client';

export async function mountManagementSection(
  coreSetup: CoreSetup,
  coreStart: CoreStart,
  license$: Observable<ILicense>,
  pollConfig: ClientConfigType['poll'],
  apiClient: ReportingAPIClient,
  params: ManagementAppMountParams
) {
  render(
    <I18nProvider>
      <ReportListing
        toasts={coreSetup.notifications.toasts}
        license$={license$}
        pollConfig={pollConfig}
        redirect={coreStart.application.navigateToApp}
        apiClient={apiClient}
      />
    </I18nProvider>,
    params.element
  );

  return () => {
    unmountComponentAtNode(params.element);
  };
}
