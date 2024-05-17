/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { createRoot } from 'react-dom/client';

import type { AppMountParameters } from '@kbn/core/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';

import type { ReportingAPIClient } from '@kbn/reporting-public';
import { RedirectApp } from './redirect_app';

interface MountParams extends AppMountParameters {
  apiClient: ReportingAPIClient;
  screenshotMode: ScreenshotModePluginSetup;
  share: SharePluginSetup;
}

export const mountRedirectApp = ({
  element,
  apiClient,
  history,
  screenshotMode,
  share,
}: MountParams) => {
  const root = createRoot(element);
  root.render(
    <EuiErrorBoundary>
      <RedirectApp
        apiClient={apiClient}
        history={history}
        screenshotMode={screenshotMode}
        share={share}
      />
    </EuiErrorBoundary>
  );

  return () => {
    root.unmount();
  };
};
