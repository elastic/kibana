/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { SearchSourceFields } from 'src/plugins/data/common';
import { ExportPanelShareOpts } from '.';
import type { ShareContext } from '../../../../../src/plugins/share/public';
import { CSV_JOB_TYPE } from '../../common/constants';
import { checkLicense } from '../lib/license_check';
import { ReportingPanelContent } from './reporting_panel_content_lazy';

export const ReportingCsvShareProvider = ({
  apiClient,
  toasts,
  uiSettings,
  license$,
  startServices$,
  usesUiCapabilities,
}: ExportPanelShareOpts) => {
  let licenseToolTipContent = '';
  let licenseHasCsvReporting = false;
  let licenseDisabled = true;
  let capabilityHasCsvReporting = false;

  license$.subscribe((license) => {
    const licenseCheck = checkLicense(license.check('reporting', 'basic'));
    licenseToolTipContent = licenseCheck.message;
    licenseHasCsvReporting = licenseCheck.showLinks;
    licenseDisabled = !licenseCheck.enableLinks;
  });

  if (usesUiCapabilities) {
    startServices$.subscribe(([{ application }]) => {
      // TODO: add abstractions in ExportTypeRegistry to use here?
      capabilityHasCsvReporting = application.capabilities.discover?.generateCsv === true;
    });
  } else {
    capabilityHasCsvReporting = true; // deprecated
  }

  const getShareMenuItems = ({ objectType, objectId, sharingData, onClose }: ShareContext) => {
    if ('search' !== objectType) {
      return [];
    }

    const jobParams = {
      title: sharingData.title as string,
      objectType,
      searchSource: sharingData.searchSource as SearchSourceFields,
      columns: sharingData.columns as string[] | undefined,
    };

    const getJobParams = () => jobParams;

    const shareActions = [];

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
