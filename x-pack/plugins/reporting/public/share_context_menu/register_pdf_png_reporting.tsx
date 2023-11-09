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
import { ExportPanelShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { ReportingModalContent } from './screen_capture_panel_content_lazy';

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
    shareableUrlForSavedObject,
    ...shareOpts
  }: ShareContext) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'gold'));
    const licenseToolTipContent = message;
    const licenseHasScreenshotReporting = showLinks;
    const licenseDisabled = !enableLinks;

    let capabilityHasDashboardScreenshotReporting = false;
    let capabilityHasVisualizeScreenshotReporting = false;
    if (usesUiCapabilities) {
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
    const isSupportedType = ['dashboard', 'visualization', 'lens'].includes(objectType);

    if (!isSupportedType) {
      return [];
    }

    if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
      return [];
    }

    if (
      isSupportedType &&
      !capabilityHasVisualizeScreenshotReporting &&
      !capabilityHasDashboardScreenshotReporting
    ) {
      return [];
    }

    const { sharingData } = shareOpts as unknown as { sharingData: ReportingSharingData };
    const shareActions = [];

    const jobProviderOptions: JobParamsProviderOptions = {
      shareableUrl: isDirty ? shareableUrl : shareableUrlForSavedObject ?? shareableUrl,
      objectType,
      sharingData,
    };

    const isV2Job = isJobV2Params(jobProviderOptions);
    const requiresSavedState = !isV2Job;
    const reportingModalTitle = i18n.translate('xpack.reporting.shareContextModal.buttonLabel', {
      defaultMessage: 'Exports',
    });

    const reportingModal = {
      shareMenuItem: {
        name: reportingModalTitle,
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'Exports',
        sortOrder: 10,
      },
      panel: {
        id: 'reportingModal',
        title: reportingModalTitle,
        content: (
          <ReportingModalContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            isDirty={isDirty}
            onClose={onClose}
            theme={theme}
            jobProviderOptions={jobProviderOptions}
          />
        ),
      },
    };

    shareActions.push(reportingModal);
    return shareActions;
  };

  return {
    id: 'screenCaptureExports',
    getShareMenuItems,
  };
};
