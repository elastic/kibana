/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SearchSourceFields } from 'src/plugins/data/common';
import { ShareContext, ShareMenuProvider } from 'src/plugins/share/public';
import { CSV_JOB_TYPE } from '../../common/constants';
import { checkLicense } from '../lib/license_check';
import { ExportPanelShareOpts } from './';
import { ReportingPanelContent } from './reporting_panel_content_lazy';

export const reportingCsvShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  application,
  license,
  usesUiCapabilities,
  theme,
}: ExportPanelShareOpts): ShareMenuProvider => {
  const getShareMenuItems = ({ objectType, objectId, sharingData, onClose }: ShareContext) => {
    if ('search' !== objectType) {
      return [];
    }

    const getSearchSource = sharingData.getSearchSource as (
      absoluteTime?: boolean
    ) => SearchSourceFields;

    const jobParams = {
      title: sharingData.title as string,
      objectType,
      columns: sharingData.columns as string[] | undefined,
    };

    const getJobParams = (forShareUrl?: boolean) => {
      const absoluteTime = !forShareUrl;
      return {
        ...jobParams,
        searchSource: getSearchSource(absoluteTime),
      };
    };

    const shareActions = [];

    const licenseCheck = checkLicense(license.check('reporting', 'basic'));
    const licenseToolTipContent = licenseCheck.message;
    const licenseHasCsvReporting = licenseCheck.showLinks;
    const licenseDisabled = !licenseCheck.enableLinks;

    // TODO: add abstractions in ExportTypeRegistry to use here?
    let capabilityHasCsvReporting = false;
    if (!application.capabilities.discover?.save && !objectId) {
      capabilityHasCsvReporting = false;
    } else if (usesUiCapabilities) {
      capabilityHasCsvReporting = application.capabilities.discover?.generateCsv === true;
    } else {
      capabilityHasCsvReporting = true; // deprecated
    }

    if (licenseHasCsvReporting && capabilityHasCsvReporting) {
      const panelTitle = i18n.translate('xpack.reporting.shareContextMenu.csvReportsButtonLabel', {
        defaultMessage: 'CSV Reports',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: licenseToolTipContent,
          disabled: licenseDisabled,
          ['data-test-subj']: 'csvReportMenuItem',
          sortOrder: 1,
        },
        panel: {
          id: 'csvReportingPanel',
          title: panelTitle,
          content: (
            <ReportingPanelContent
              requiresSavedState={false}
              apiClient={apiClient}
              toasts={toasts}
              uiSettings={uiSettings}
              reportType={CSV_JOB_TYPE}
              layoutId={undefined}
              objectId={objectId}
              getJobParams={getJobParams}
              onClose={onClose}
              theme={theme}
            />
          ),
        },
      });
    }

    return shareActions;
  };

  return {
    id: 'csvReports',
    getShareMenuItems,
  };
};
