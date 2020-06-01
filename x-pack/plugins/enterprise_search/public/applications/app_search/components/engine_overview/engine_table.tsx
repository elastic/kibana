/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiBasicTable, EuiLink } from '@elastic/eui';
import { FormattedMessage, FormattedDate, FormattedNumber } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';

import { ENGINES_PAGE_SIZE } from '../../../../../common/constants';

interface IEngineTableProps {
  data: Array<{
    name: string;
    created_at: string;
    document_count: number;
    field_count: number;
  }>;
  pagination: {
    totalEngines: number;
    pageIndex: number;
    onPaginate(pageIndex: number);
  };
}
interface IOnChange {
  page: {
    index: number;
  };
}

export const EngineTable: ReactFC<IEngineTableProps> = ({
  data,
  pagination: { totalEngines, pageIndex = 0, onPaginate },
}) => {
  const { enterpriseSearchUrl, http } = useContext(KibanaContext) as IKibanaContext;
  const engineLinkProps = (name) => ({
    href: `${enterpriseSearchUrl}/as/engines/${name}`,
    target: '_blank',
    onClick: () =>
      sendTelemetry({
        http,
        product: 'app_search',
        action: 'clicked',
        metric: 'engine_table_link',
      }),
  });

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.name', {
        defaultMessage: 'Name',
      }),
      render: (name) => <EuiLink {...engineLinkProps(name)}>{name}</EuiLink>,
      width: '30%',
      truncateText: true,
      mobileOptions: {
        header: true,
        enlarge: true,
        fullWidth: true,
        truncateText: false,
      },
    },
    {
      field: 'created_at',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.createdAt',
        {
          defaultMessage: 'Created At',
        }
      ),
      dataType: 'string',
      render: (dateString) => (
        // e.g., January 1, 1970
        <FormattedDate value={new Date(dateString)} year="numeric" month="long" day="numeric" />
      ),
    },
    {
      field: 'document_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.documentCount',
        {
          defaultMessage: 'Document Count',
        }
      ),
      dataType: 'number',
      render: (number) => <FormattedNumber value={number} />,
      truncateText: true,
    },
    {
      field: 'field_count',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.fieldCount',
        {
          defaultMessage: 'Field Count',
        }
      ),
      dataType: 'number',
      render: (number) => <FormattedNumber value={number} />,
      truncateText: true,
    },
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.actions',
        {
          defaultMessage: 'Actions',
        }
      ),
      dataType: 'string',
      render: (name) => (
        <EuiLink {...engineLinkProps(name)}>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.enginesOverview.table.action.manage"
            defaultMessage="Manage"
          />
        </EuiLink>
      ),
      align: 'right',
      width: '100px',
    },
  ];

  return (
    <EuiBasicTable
      items={data}
      columns={columns}
      pagination={{
        pageIndex,
        pageSize: ENGINES_PAGE_SIZE,
        totalItemCount: totalEngines,
        hidePerPageOptions: true,
      }}
      onChange={({ page }): IOnChange => {
        const { index } = page;
        onPaginate(index + 1); // Note on paging - App Search's API pages start at 1, EuiBasicTables' pages start at 0
      }}
    />
  );
};
