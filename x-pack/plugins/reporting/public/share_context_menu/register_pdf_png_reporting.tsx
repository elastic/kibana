/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ShareContext, ShareMenuProvider } from '@kbn/share-plugin/public';
import { isJobV2Params } from '../../common/job_utils';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ExportPanelShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { ScreenCapturePanelContent } from './screen_capture_panel_content_lazy';

const getJobParams =
  (
    apiClient: ReportingAPIClient,
    opts: JobParamsProviderOptions,
    type: 'png' | 'pngV2' | 'printablePdf' | 'printablePdfV2'
  ) =>
  () => {
    const {
      objectType,
      sharingData: { title, layout, locatorParams },
    } = opts;

    const baseParams = {
      objectType,
      layout,
      title,
    };

    if (type === 'printablePdfV2') {
      // multi locator for PDF V2
      return { ...baseParams, locatorParams: [locatorParams] };
    } else if (type === 'pngV2') {
      // single locator for PNG V2
      return { ...baseParams, locatorParams };
    }

    // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
    // Replace hashes with original RISON values.
    const relativeUrl = opts.shareableUrl.replace(
      window.location.origin + apiClient.getServerBasePath(),
      ''
    );

    if (type === 'printablePdf') {
      // multi URL for PDF
      return { ...baseParams, relativeUrls: [relativeUrl] };
    }

    // single URL for PNG
    return { ...baseParams, relativeUrl };
  };

export const reportingScreenshotShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  license,
  application,
  usesUiCapabilities,
  theme,
}: ExportPanelShareOpts): ShareMenuProvider => {
  const getShareMenuItems = ({
    objectType,
    objectId,
    isDirty,
    onClose,
    shareableUrl,
    ...shareOpts
  }: ShareContext) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'gold'));
    const licenseToolTipContent = message;
    const licenseHasScreenshotReporting = showLinks;
    const licenseDisabled = !enableLinks;

    let capabilityHasDashboardScreenshotReporting = false;
    let capabilityHasVisualizeScreenshotReporting = false;
    if (usesUiCapabilities) {
      // TODO: add abstractions in ExportTypeRegistry to use here?
      capabilityHasDashboardScreenshotReporting =
        application.capabilities.dashboard?.generateScreenshot === true;
      capabilityHasVisualizeScreenshotReporting =
        application.capabilities.visualize?.generateScreenshot === true;
    } else {
      // deprecated
      capabilityHasDashboardScreenshotReporting = true;
      capabilityHasVisualizeScreenshotReporting = true;
    }

    if (!licenseHasScreenshotReporting) {
      return [];
    }

    if (!['dashboard', 'visualization'].includes(objectType)) {
      return [];
    }

    if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
      return [];
    }

    if (objectType === 'visualize' && !capabilityHasVisualizeScreenshotReporting) {
      return [];
    }

    const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };
    const shareActions = [];

    const pngPanelTitle = i18n.translate('xpack.reporting.shareContextMenu.pngReportsButtonLabel', {
      defaultMessage: 'PNG Reports',
    });

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl,
      objectType,
      sharingData,
    };

    const isV2Job = isJobV2Params(jobProviderOptions);
    const requiresSavedState = !isV2Job;

    const pngReportType = isV2Job ? 'pngV2' : 'png';

    const panelPng = {
      shareMenuItem: {
        name: pngPanelTitle,
        icon: 'document',
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled,
        ['data-test-subj']: 'pngReportMenuItem',
        sortOrder: 10,
      },
      panel: {
        id: 'reportingPngPanel',
        title: pngPanelTitle,
        content: (
          <ScreenCapturePanelContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            reportType={pngReportType}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            getJobParams={getJobParams(apiClient, jobProviderOptions, pngReportType)}
            isDirty={isDirty}
            onClose={onClose}
            theme={theme}
          />
        ),
      },
    };

    const pdfPanelTitle = i18n.translate('xpack.reporting.shareContextMenu.pdfReportsButtonLabel', {
      defaultMessage: 'PDF Reports',
    });

    const pdfReportType = isV2Job ? 'printablePdfV2' : 'printablePdf';

    const panelPdf = {
      shareMenuItem: {
        name: pdfPanelTitle,
        icon: 'document',
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled,
        ['data-test-subj']: 'pdfReportMenuItem',
        sortOrder: 10,
      },
      panel: {
        id: 'reportingPdfPanel',
        title: pdfPanelTitle,
        content: (
          <ScreenCapturePanelContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            reportType={pdfReportType}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            getJobParams={getJobParams(apiClient, jobProviderOptions, pdfReportType)}
            isDirty={isDirty}
            onClose={onClose}
            theme={theme}
          />
        ),
      },
    };

    shareActions.push(panelPng);
    shareActions.push(panelPdf);
    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
};
