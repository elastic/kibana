/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import React from 'react';
import { IUiSettingsClient, ToastsSetup } from 'src/core/public';
import { ShareContext } from '../../../../../src/plugins/share/public';
import { LicensingPluginSetup } from '../../../licensing/public';
import { LayoutInstance } from '../../common/types';
import { JobParamsPNG } from '../../server/export_types/png/types';
import { JobParamsPDF } from '../../server/export_types/printable_pdf/types';
import { ScreenCapturePanelContent } from '../components/screen_capture_panel_content';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient } from '../lib/reporting_api_client';

interface ReportingPDFPNGProvider {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  license$: LicensingPluginSetup['license$'];
  uiSettings: IUiSettingsClient;
}

export const reportingPDFPNGProvider = ({
  apiClient,
  toasts,
  license$,
  uiSettings,
}: ReportingPDFPNGProvider) => {
  let toolTipContent = '';
  let disabled = true;
  let hasPDFPNGReporting = false;

  license$.subscribe((license) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'gold'));

    toolTipContent = message;
    hasPDFPNGReporting = showLinks;
    disabled = !enableLinks;
  });

  // If the TZ is set to the default "Browser", it will not be useful for
  // server-side export. We need to derive the timezone and pass it as a param
  // to the export API.
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
    if (!['dashboard', 'visualization'].includes(objectType)) {
      return [];
    }
    // Dashboard only mode does not currently support reporting
    // https://github.com/elastic/kibana/issues/18286
    // @TODO For NP
    if (objectType === 'dashboard' && false) {
      return [];
    }

    const getPdfJobParams = (): JobParamsPDF => {
      // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
      // Replace hashes with original RISON values.
      const relativeUrl = shareableUrl.replace(
        window.location.origin + apiClient.getServerBasePath(),
        ''
      );

      return {
        objectType,
        browserTimezone,
        relativeUrls: [relativeUrl], // multi URL for PDF
        layout: sharingData.layout as LayoutInstance,
        title: sharingData.title as string,
      };
    };

    const getPngJobParams = (): JobParamsPNG => {
      // Replace hashes with original RISON values.
      const relativeUrl = shareableUrl.replace(
        window.location.origin + apiClient.getServerBasePath(),
        ''
      );

      return {
        objectType,
        browserTimezone,
        relativeUrl, // single URL for PNG
        layout: sharingData.layout as LayoutInstance,
        title: sharingData.title as string,
      };
    };

    const shareActions = [];

    if (hasPDFPNGReporting) {
      const pngPanelTitle = i18n.translate(
        'xpack.reporting.shareContextMenu.pngReportsButtonLabel',
        {
          defaultMessage: 'PNG Reports',
        }
      );

      const pdfPanelTitle = i18n.translate(
        'xpack.reporting.shareContextMenu.pdfReportsButtonLabel',
        {
          defaultMessage: 'PDF Reports',
        }
      );

      shareActions.push({
        shareMenuItem: {
          name: pngPanelTitle,
          icon: 'document',
          toolTipContent,
          disabled,
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
              reportType="png"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getPngJobParams}
              isDirty={isDirty}
              onClose={onClose}
            />
          ),
        },
      });

      shareActions.push({
        shareMenuItem: {
          name: pdfPanelTitle,
          icon: 'document',
          toolTipContent,
          disabled,
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
              reportType="printablePdf"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getPdfJobParams}
              isDirty={isDirty}
              onClose={onClose}
            />
          ),
        },
      });
    }

    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
};
