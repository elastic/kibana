/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { SearchSourceFields } from '@kbn/data-plugin/common';
import { DataView, SortDirection } from '@kbn/data-plugin/common';
import { ReportingAPIClient } from '@kbn/reporting-public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';

import { useKibanaVersion, useStartServices } from '../../../../../../hooks';

export function useExportCSV() {
  const startServices = useStartServices();
  const { notifications, http, uiSettings } = startServices;
  const kibanaVersion = useKibanaVersion();

  // TODO pass columns from Agent list UI
  const columns = [
    'agent.id',
    'policy_id', // policy name would need a data view + enrich processor
    'local_metadata.host.hostname',
    'last_checkin',
    'status',
  ];

  const index = new DataView({
    spec: {
      title: '.fleet-agents',
      allowHidden: true,
      runtimeFieldMap: {
        status: {
          type: 'keyword',
          // TODO all statuses, needs a new API to get the runtime field script from backend
          script: {
            source: 'emit(doc["active"].value == false ? "unenrolled" : "online")',
          },
        },
      },
    },
    fieldFormats: {} as FieldFormatsStartCommon,
  });

  const searchSource: SearchSourceFields = {
    type: 'search',
    query: {
      query: '',
      language: 'kuery',
    },
    filter: {
      meta: {
        index: 'fleet-agents',
        params: {},
      },
      // TODO pass query from Agent list UI
      query: {
        range: {
          last_checkin: {
            format: 'strict_date_optional_time',
            gte: '2024-10-15T08:44:13.937Z',
          },
        },
      },
    },
    fields: columns.map((field) => ({ field })),
    index,
    // TODO pass sort order from Agent list UI
    sort: [
      {
        last_checkin: {
          order: SortDirection.desc,
          format: 'strict_date_optional_time',
        },
      },
    ],
  };

  const getJobParams = () => {
    return {
      title: 'Agent List',
      objectType: 'search',
      columns,
      searchSource,
    };
  };

  const apiClient = new ReportingAPIClient(http, uiSettings, kibanaVersion);

  // copied and adapted logic from here: https://github.com/elastic/kibana/blob/2846a162de7e56d2107eeb2e33e006a3310a4ae1/packages/kbn-reporting/public/share/share_context_menu/register_csv_modal_reporting.tsx#L86
  const generateReportingJobCSV = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
    return apiClient
      .createReportingShareJob('csv_searchsource', decoratedJobParams)
      .then(() => {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.fleet.modalContent.successfullyQueuedReportNotificationTitle',
            { defaultMessage: 'Queued report for CSV' }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.fleet.modalContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.fleet.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                      defaultMessage="Stack Management &gt; Reporting"
                    />
                  </a>
                ),
              }}
            />,
            startServices
          ),
          'data-test-subj': 'queueReportSuccess',
        });
      })
      .catch((error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.modalContent.notification.reportingErrorTitle', {
            defaultMessage: 'Unable to create report',
          }),
          toastMessage: (
            // eslint-disable-next-line react/no-danger
            <span dangerouslySetInnerHTML={{ __html: error.body?.message }} />
          ) as unknown as string,
        });
      });
  };

  return {
    generateReportingJobCSV,
  };
}
