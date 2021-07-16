/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import React from 'react';
import * as Rx from 'rxjs';
import type { IUiSettingsClient, ToastsSetup } from 'src/core/public';
import { CoreStart } from 'src/core/public';
import { ShareContext } from 'src/plugins/share/public';
import type { LicensingPluginSetup } from '../../../licensing/public';
import type { LayoutParams, LocatorParams } from '../../common/types';
import { isJobV2Params } from '../../common/job_utils';
import type { JobParamsPNG } from '../../server/export_types/png/types';
import type { JobParamsPNGV2 } from '../../server/export_types/png_v2/types';
import type { JobParamsPDF } from '../../server/export_types/printable_pdf/types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { JobParamsPDFV2 } from '../../server/export_types/printable_pdf_v2/types';
import { checkLicense } from '../lib/license_check';
import type { ReportingAPIClient } from '../lib/reporting_api_client';
import { ScreenCapturePanelContent } from './screen_capture_panel_content_lazy';

interface JobParamsProviderOptions {
  shareableUrl: string;
  apiClient: ReportingAPIClient;
  objectType: string;
  browserTimezone: string;
  sharingData: Record<string, unknown>;
}

const jobParamsProvider = ({
  objectType,
  browserTimezone,
  sharingData,
}: JobParamsProviderOptions) => {
  return {
    objectType,
    browserTimezone,
    layout: sharingData.layout as LayoutParams,
    title: sharingData.title as string,
  };
};

const getPdfV1JobParams = (opts: JobParamsProviderOptions) => (): JobParamsPDF => {
  // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
  // Replace hashes with original RISON values.
  const relativeUrl = opts.shareableUrl.replace(
    window.location.origin + opts.apiClient.getServerBasePath(),
    ''
  );

  return {
    ...jobParamsProvider(opts),
    relativeUrls: [relativeUrl], // multi URL for PDF
  };
};

const getPdfV2JobParams = (opts: JobParamsProviderOptions) => (): JobParamsPDFV2 => {
  const locatorParams = opts.sharingData.locatorParams as LocatorParams;
  return {
    ...jobParamsProvider(opts),
    forceNow: new Date().toISOString(),
    locatorParams: [locatorParams], // multi locator for PDF
  };
};

const getPdfJobParams = (opts: JobParamsProviderOptions) =>
  isJobV2Params(opts) ? getPdfV2JobParams(opts) : getPdfV1JobParams(opts);

const getPngJobParamsV1 = (opts: JobParamsProviderOptions) => (): JobParamsPNG => {
  // Replace hashes with original RISON values.
  const relativeUrl = opts.shareableUrl.replace(
    window.location.origin + opts.apiClient.getServerBasePath(),
    ''
  );

  return {
    ...jobParamsProvider(opts),
    relativeUrl, // single URL for PNG
  };
};

const getPngJobParamsV2 = (opts: JobParamsProviderOptions) => (): JobParamsPNGV2 => {
  const locatorParams = opts.sharingData.locatorParams as LocatorParams;
  return {
    ...jobParamsProvider(opts),
    forceNow: new Date().toISOString(),
    locatorParams,
  };
};

const getPngJobParams = (opts: JobParamsProviderOptions) =>
  isJobV2Params(opts) ? getPngJobParamsV2(opts) : getPngJobParamsV1(opts);

export const reportingScreenshotShareProvider = ({
  apiClient,
  toasts,
  license$,
  startServices$,
  uiSettings,
  usesUiCapabilities,
}: {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  license$: LicensingPluginSetup['license$'];
  startServices$: Rx.Observable<[CoreStart, object, unknown]>;
  uiSettings: IUiSettingsClient;
  usesUiCapabilities: boolean;
}) => {
  let licenseToolTipContent = '';
  let licenseDisabled = true;
  let licenseHasScreenshotReporting = false;
  let capabilityHasDashboardScreenshotReporting = false;
  let capabilityHasVisualizeScreenshotReporting = false;

  license$.subscribe((license) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'gold'));
    licenseToolTipContent = message;
    licenseHasScreenshotReporting = showLinks;
    licenseDisabled = !enableLinks;
  });

  if (usesUiCapabilities) {
    startServices$.subscribe(([{ application }]) => {
      // TODO: add abstractions in ExportTypeRegistry to use here?
      capabilityHasDashboardScreenshotReporting =
        application.capabilities.dashboard?.generateScreenshot === true;
      capabilityHasVisualizeScreenshotReporting =
        application.capabilities.visualize?.generateScreenshot === true;
    });
  } else {
    // deprecated
    capabilityHasDashboardScreenshotReporting = true;
    capabilityHasVisualizeScreenshotReporting = true;
  }

  // If the TZ is set to the default "Browser", it will not be useful for
  // server-side export. We need to derive the timezone and pass it as a param
  // to the export API.
  // TODO: create a helper utility in Reporting. This is repeated in a few places.
  const browserTimezone =
    uiSettings.get('dateFormat:tz') === 'Browser'
      ? moment.tz.guess()
      : uiSettings.get('dateFormat:tz');

  const getShareMenuItems = ({
    objectType,
    objectId,
    sharingData,
    isDirty,
    onClose,
    shareableUrl,
  }: ShareContext) => {
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

    const shareActions = [];

    const pngPanelTitle = i18n.translate('xpack.reporting.shareContextMenu.pngReportsButtonLabel', {
      defaultMessage: 'PNG Reports',
    });

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl,
      apiClient,
      objectType,
      browserTimezone,
      sharingData,
    };

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
            reportType={isJobV2Params(jobProviderOptions) ? 'pngV2' : 'png'}
            objectId={objectId}
            requiresSavedState={true}
            getJobParams={getPngJobParams(jobProviderOptions)}
            isDirty={isDirty}
            onClose={onClose}
          />
        ),
      },
    };

    const pdfPanelTitle = i18n.translate('xpack.reporting.shareContextMenu.pdfReportsButtonLabel', {
      defaultMessage: 'PDF Reports',
    });

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
            reportType={isJobV2Params(jobProviderOptions) ? 'printablePdfV2' : 'printablePdf'}
            objectId={objectId}
            getJobParams={getPdfJobParams(jobProviderOptions)}
            requiresSavedState={true}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            isDirty={isDirty}
            onClose={onClose}
          />
        ),
      },
    };

    shareActions.push(panelPng);
    shareActions.push(panelPdf);
    return shareActions;
  };

  return { id: 'screenCaptureReports', getShareMenuItems };
};
