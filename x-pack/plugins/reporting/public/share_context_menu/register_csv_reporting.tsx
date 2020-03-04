/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { ReportingPanelContent } from '../components/reporting_panel_content';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { LicensingPluginSetup, LICENSE_CHECK_STATE } from '../../../licensing/public';
import { ShareContext } from '../../../../../src/plugins/share/public';
import { ToastsSetup } from '../..';

interface ReportingProvider {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  license$: LicensingPluginSetup['license$'];
}

export const csvReportingProvider = ({ apiClient, toasts, license$ }: ReportingProvider) => {
  let toolTipContent = '';
  let disabled = true;
  let hasCSVReporting = false;

  license$.subscribe(license => {
    const { state, message = '' } = license.check('reporting', 'basic');
    const enableLinks = state === LICENSE_CHECK_STATE.Valid;

    toolTipContent = message;
    hasCSVReporting = enableLinks;
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
