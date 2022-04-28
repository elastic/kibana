/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBadge,
  EuiHealth,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';

import { ApiLogsLogic } from '..';
import { convertMetaToPagination, handlePageChange } from '../../../../shared/table_pagination';

import { ApiLogLogic } from '../api_log';
import { ApiLog } from '../types';
import { getStatusColor } from '../utils';

import { EmptyState } from '.';

import './api_logs_table.scss';

interface Props {
  hasPagination?: boolean;
}
export const ApiLogsTable: React.FC<Props> = ({ hasPagination }) => {
  const { dataLoading, apiLogs, meta } = useValues(ApiLogsLogic);
  const { onPaginate } = useActions(ApiLogsLogic);
  const { openFlyout } = useActions(ApiLogLogic);

  const columns: Array<EuiBasicTableColumn<ApiLog>> = [
    {
      field: 'http_method',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.methodTableHeading', {
        defaultMessage: 'Method',
      }),
      width: '100px',
      render: (method: string) => <EuiBadge color="primary">{method}</EuiBadge>,
    },
    {
      field: 'timestamp',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.timeTableHeading', {
        defaultMessage: 'Time',
      }),
      width: '20%',
      render: (dateString: string) => <FormattedRelative value={new Date(dateString)} />,
    },
    {
      field: 'full_request_path',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.endpointTableHeading', {
        defaultMessage: 'Endpoint',
      }),
      width: '50%',
      truncateText: true,
      mobileOptions: {
        // @ts-ignore - EUI's typing is incorrect here
        width: '100%',
      },
    },
    {
      field: 'status',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.statusTableHeading', {
        defaultMessage: 'Status',
      }),
      dataType: 'number',
      width: '100px',
      render: (status: number) => <EuiHealth color={getStatusColor(status)}>{status}</EuiHealth>,
    },
    {
      width: '100px',
      align: 'right',
      render: (apiLog: ApiLog) => (
        <EuiButtonEmpty
          size="s"
          className="apiLogDetailButton"
          data-test-subj="ApiLogsTableDetailsButton"
          onClick={() => openFlyout(apiLog)}
        >
          {i18n.translate('xpack.enterpriseSearch.appSearch.engine.apiLogs.detailsButtonLabel', {
            defaultMessage: 'Details',
          })}
        </EuiButtonEmpty>
      ),
    },
  ];

  const paginationProps = hasPagination
    ? {
        pagination: {
          ...convertMetaToPagination(meta),
          showPerPageOptions: false,
        },
        onChange: handlePageChange(onPaginate),
      }
    : {};

  return (
    <EuiBasicTable
      columns={columns}
      items={apiLogs}
      responsive
      loading={dataLoading}
      noItemsMessage={<EmptyState />}
      {...paginationProps}
    />
  );
};
