/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { EsQuerySortValue, SearchSourceFields } from '@kbn/data-plugin/common';
import { DataView, SortDirection } from '@kbn/data-plugin/common';
import { ReportingAPIClient } from '@kbn/reporting-public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';

import {
  useGetAgentStatusRuntimeFieldQuery,
  useKibanaVersion,
  useStartServices,
} from '../../../../../../hooks';
import type { Agent } from '../../../../../../../common';
import { getSortConfig, removeSOAttributes } from '../../../../../../../common';

import type { ExportField } from '../../components/agent_export_csv_modal';

import { getSortFieldForAPI } from './use_fetch_agents_data';

export function useExportCSV(enableExportCSV?: boolean) {
  const startServices = useStartServices();
  const { notifications, http, uiSettings } = startServices;
  const kibanaVersion = useKibanaVersion();
  const { data: runtimeFieldsResponse } = useGetAgentStatusRuntimeFieldQuery({
    enabled: enableExportCSV,
  });
  const runtimeFields = runtimeFieldsResponse ? runtimeFieldsResponse : 'emit("")';

  const getJobParams = (
    agents: Agent[] | string,
    columns: Array<{ field: string }>,
    sortOptions?: { field?: string; direction?: string }
  ) => {
    const index = new DataView({
      spec: {
        title: '.fleet-agents',
        allowHidden: true,
        runtimeFieldMap: {
          status: {
            type: 'keyword',
            script: {
              source: runtimeFields,
            },
          },
        },
      },
      fieldFormats: {} as FieldFormatsStartCommon,
    });

    let query: string;
    if (Array.isArray(agents)) {
      query = `agent.id:(${agents.map((agent) => agent.id).join(' OR ')})`;
    } else {
      query = agents;
    }

    const sortField = getSortFieldForAPI(sortOptions?.field ?? 'enrolled_at');
    const sortOrder = (sortOptions?.direction as SortDirection) ?? SortDirection.desc;

    const sort = getSortConfig(sortField, sortOrder) as EsQuerySortValue[];

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
        query: toElasticsearchQuery(fromKueryExpression(removeSOAttributes(query))),
      },
      fields: columns,
      index,
      sort,
    };

    return {
      title: 'Agent List',
      objectType: 'search',
      columns: columns.map((column) => column.field),
      searchSource,
    };
  };

  const apiClient = new ReportingAPIClient(http, uiSettings, kibanaVersion);

  // copied and adapted logic from here: https://github.com/elastic/kibana/blob/2846a162de7e56d2107eeb2e33e006a3310a4ae1/packages/kbn-reporting/public/share/share_context_menu/register_csv_modal_reporting.tsx#L86
  const generateReportingJobCSV = (
    agents: Agent[] | string,
    columns: ExportField[],
    sortOptions?: { field?: string; direction?: string }
  ) => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(
      getJobParams(agents, columns, sortOptions)
    );
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
