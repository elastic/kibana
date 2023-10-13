/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Observable } from 'rxjs';

import { EuiLoadingSpinner } from '@elastic/eui';

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { ILicense } from '@kbn/licensing-plugin/public';
import { ErrorBoundary, ErrorBoundaryKibanaProvider } from '@kbn/shared-ux-error-boundary';

import type { ReportingAPIClient } from '../lib/reporting_api_client';
import type { ClientConfigType } from '../plugin';
import type { ManagementAppMountParams, SharePluginSetup } from '../shared_imports';

const ManagementApp = lazy(() =>
  // component is not the default export of the module
  import('./management_app').then((module) => ({ default: module.ManagementApp }))
);

interface MountSectionOpts {
  coreSetup: CoreSetup;
  coreStart: CoreStart;
  license$: Observable<ILicense>;
  config: ClientConfigType;
  apiClient: ReportingAPIClient;
  urlService: SharePluginSetup['url'];
  params: ManagementAppMountParams;
}

export function mountManagementSection(opts: MountSectionOpts) {
  const { coreSetup, coreStart, license$, config, apiClient, urlService, params } = opts;

  render(
    <ErrorBoundaryKibanaProvider>
      <ErrorBoundary>
        <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
          <ManagementApp
            license$={license$}
            config={config}
            apiClient={apiClient}
            urlService={urlService}
            coreSetup={coreSetup}
            coreStart={coreStart}
            params={params}
          />
        </Suspense>
      </ErrorBoundary>
    </ErrorBoundaryKibanaProvider>,
    params.element
  );

  return () => {
    unmountComponentAtNode(params.element);
  };
}
