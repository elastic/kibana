/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { ToastsSetup } from 'src/core/public';
import { ReportingPanelContent } from '../components/reporting_panel_content';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { checkLicense } from '../lib/license_check';
import { LicensingPluginSetup } from '../../../licensing/public';
import { ShareContext } from '../../../../../src/plugins/share/public';

interface ReportingProvider {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  license$: LicensingPluginSetup['license$'];
}

export const csvReportingProvider = ({ apiClient, toasts, license$ }: ReportingProvider) => {
  let toolTipContent = '';
  let disabled = true;
  let hasCSVReporting = false;

  license$.subscribe((license) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'basic'));

    toolTipContent = message;
    hasCSVReporting = showLinks;
    disabled = !enableLinks;
  });

  const getShareMenuItems = ({
    objectType,
    objectId,
    sharingData,
    isDirty,
    onClose,
  }: ShareContext) => {
    if ('search' !== objectType) {
      return [];
    }

    const getJobParams = () => {
      return {
        ...sharingData,
        type: objectType,
      };
    };

    const shareActions = [];

    if (hasCSVReporting) {
      const panelTitle = i18n.translate('xpack.reporting.shareContextMenu.csvReportsButtonLabel', {
        defaultMessage: 'CSV Reports',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent,
          disabled,
          ['data-test-subj']: 'csvReportMenuItem',
          sortOrder: 1,
        },
        panel: {
          id: 'csvReportingPanel',
          title: panelTitle,
          content: (
            <ReportingPanelContent
              apiClient={apiClient}
              toasts={toasts}
              reportType="csv"
              layoutId={undefined}
              objectType={objectType}
              objectId={objectId}
              getJobParams={getJobParams}
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
    id: 'csvReports',
    getShareMenuItems,
  };
};
