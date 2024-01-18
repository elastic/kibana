/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { ShareContext, ShareMenuProvider } from '@kbn/share-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { isJobV2Params } from '../../common/job_utils';
import { checkLicense } from '../lib/license_check';
import { ExportModalShareOpts, JobParamsProviderOptions, ReportingSharingData } from '.';
import { ReportingModalContent } from './image_export_modal';

export const reportingScreenshotShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  license,
  application,
  usesUiCapabilities,
  theme,
  overlays,
  i18nStart,
}: ExportModalShareOpts): ShareMenuProvider => {
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

    const openImageModal = () => {
      const session = overlays.openModal(
        toMountPoint(
          <ReportingModalContent
            apiClient={apiClient}
            toasts={toasts}
            uiSettings={uiSettings}
            objectId={objectId}
            requiresSavedState={requiresSavedState}
            layoutOption={objectType === 'dashboard' ? 'print' : undefined}
            jobProviderOptions={jobProviderOptions}
            isDirty={isDirty}
            onClose={() => {
              session.close();
              onClose();
            }}
            theme={theme}
            objectType={objectType}
          />,
          { theme, i18n: i18nStart }
        ),
        {
          maxWidth: 400,
          'data-test-subj': 'export-image-modal',
        }
      );
    };
    const imageModal = {
      shareMenuItem: {
        name: i18n.translate('xpack.reporting.shareContextMenu.ExportsButtonLabel', {
          defaultMessage: 'Reports',
        }),
        icon: 'document',
        toolTipContent: licenseToolTipContent,
        disabled: licenseDisabled || sharingData.reportingDisabled,
        ['data-test-subj']: 'imageExports',
        sortOrder: 10,
        onClick: openImageModal,
      },
      panel: {
        id: 'reportingImageModal',
        title: i18n.translate('xpack.reporting.shareContextMenu.ReportsButtonLabel', {
          defaultMessage: 'Reports',
        }),
        content: openImageModal,
      },
    };

    shareActions.push(imageModal);
    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareMenuItems,
  };
};
