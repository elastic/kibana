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
import type { SearchSourceFields } from 'src/plugins/data/common';
import type { ShareContext } from '../../../../../src/plugins/share/public';
import type { LicensingPluginSetup } from '../../../licensing/public';
import { CSV_JOB_TYPE } from '../../common/constants';
import type { JobParamsCSV } from '../../server/export_types/csv_searchsource/types';
import { ReportingPanelContent } from '../components/reporting_panel_content_lazy';
import { checkLicense } from '../lib/license_check';
import type { ReportingAPIClient } from '../lib/reporting_api_client';

export const ReportingCsvShareProvider = ({
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

  // If the TZ is set to the default "Browser", it will not be useful for
  // server-side export. We need to derive the timezone and pass it as a param
  // to the export API.
  // TODO: create a helper utility in Reporting. This is repeated in a few places.
  const browserTimezone =
    uiSettings.get('dateFormat:tz') === 'Browser'
      ? moment.tz.guess()
      : uiSettings.get('dateFormat:tz');

  const getShareMenuItems = ({ objectType, objectId, sharingData, onClose }: ShareContext) => {
    if ('search' !== objectType) {
      return [];
    }

    const jobParams: JobParamsCSV = {
      browserTimezone,
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
