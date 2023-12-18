/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/public';
import { ILicense } from '@kbn/licensing-plugin/public';
import React from 'react';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { SharePluginSetup } from '../shared_imports';
import { JobParamsProviderOptions, reportingScreenshotShareProvider } from '../share_context_menu';
import { ReportingModalContent } from '../share_context_menu/reporting_panel_content_lazy';
/**
 * Properties for displaying a share menu with Reporting features.
 */
export interface ApplicationProps {
  /**
   * Option to control how the screenshot(s) is/are placed in the PDF
   */
  layoutOption?: 'canvas' | 'print';

  /**
   * Saved object ID
   */
  objectId?: string;

  /**
   * A function to callback when the Reporting panel should be closed
   */
  onClose: () => void;
}

/**
 * As of 7.14, the only shared component is a PDF report that is suited for Canvas integration.
 * This is not planned to expand, as work is to be done on moving the export-type implementations out of Reporting
 * Related Discuss issue: https://github.com/elastic/kibana/issues/101422
 */
export const getSharedComponents = async (
  core: CoreSetup,
  apiClient: ReportingAPIClient,
  share: SharePluginSetup
) => {
  const [plugins, startDeps] = await core.getStartServices();
  const { jobProviderOptions } = reportingScreenshotShareProvider({
    apiClient,
    toasts: plugins.notifications.toasts,
    uiSettings: core.uiSettings,
    license: startDeps as ILicense,
    usesUiCapabilities: true,
    application: plugins.application,
    theme: core.theme,
    overlays: plugins.overlays,
    i18nStart: plugins.i18n,
    urlService: share?.url,
  });

  return (
    <ReportingModalContent
      requiresSavedState={false}
      apiClient={apiClient}
      toasts={core.notifications.toasts}
      uiSettings={core.uiSettings}
      theme={core.theme}
      jobProviderOptions={jobProviderOptions as unknown as JobParamsProviderOptions}
      onClose={() => {}}
    />
  );
};
