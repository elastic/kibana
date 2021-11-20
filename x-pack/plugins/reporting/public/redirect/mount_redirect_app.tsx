/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, unmountComponentAtNode } from 'react-dom';
import React from 'react';
import { EuiErrorBoundary } from '@elastic/eui';

import type { AppMountParameters } from 'kibana/public';
import type { SharePluginSetup } from '../shared_imports';
import type { ReportingAPIClient } from '../lib/reporting_api_client';

import { RedirectApp } from './redirect_app';

interface MountParams extends AppMountParameters {
  apiClient: ReportingAPIClient;
  share: SharePluginSetup;
}

export const mountRedirectApp = ({ element, apiClient, history, share }: MountParams) => {
  render(
    <EuiErrorBoundary>
      <RedirectApp apiClient={apiClient} history={history} share={share} />
    </EuiErrorBoundary>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
