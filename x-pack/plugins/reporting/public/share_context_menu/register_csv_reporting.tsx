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
import { JobParamsDiscoverCsv, SearchRequest } from '../../server/export_types/csv/types';
import { ReportingPanelContent } from '../components/reporting_panel_content';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient } from '../lib/reporting_api_client';

interface ReportingProvider {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  license$: LicensingPluginSetup['license$'];
  uiSettings: IUiSettingsClient;
}

export const csvReportingProvider = ({
  apiClient,
  toasts,
  license$,
  uiSettings,
}: ReportingProvider) => {
  let toolTipContent = '';
  let disabled = true;
  let hasCSVReporting = false;

  license$.subscribe((license) => {
    const { enableLinks, showLinks, message } = checkLicense(license.check('reporting', 'basic'));

    toolTipContent = message;
    hasCSVReporting = showLinks;
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
  }: ShareContext) => {
    if ('search' !== objectType) {
      return [];
    }

    const jobParams: JobParamsDiscoverCsv = {
      browserTimezone,
      objectType,
      title: sharingData.title as string,
      indexPatternId: sharingData.indexPatternId as string,
      searchRequest: sharingData.searchRequest as SearchRequest,
      fields: sharingData.fields as string[],
      metaFields: sharingData.metaFields as string[],
      conflictedTypesFields: sharingData.conflictedTypesFields as string[],
    };

    const getJobParams = () => jobParams;

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
