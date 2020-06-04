/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiBasicTable, EuiBasicTableColumn, EuiLink } from '@elastic/eui';
import { FormattedMessage, FormattedDate, FormattedNumber } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';

import { ENGINES_PAGE_SIZE } from '../../../../../common/constants';

export interface IEngineTableData {
  name: string;
  created_at: string;
  document_count: number;
  field_count: number;
}
export interface IEngineTablePagination {
  totalEngines: number;
  pageIndex: number;
  onPaginate(pageIndex: number): void;
}
export interface IEngineTableProps {
  data: IEngineTableData[];
  pagination: IEngineTablePagination;
}
export interface IOnChange {
  page: {
    index: number;
  };
}

export const EngineTable: React.FC<IEngineTableProps> = ({
  data,
  pagination: { totalEngines, pageIndex, onPaginate },
}) => {
  const { enterpriseSearchUrl, http } = useContext(KibanaContext) as IKibanaContext;
  const engineLinkProps = (name: string) => ({
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

  const columns: Array<EuiBasicTableColumn<IEngineTableData>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.name', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => (
        <EuiLink data-test-subj="engineNameLink" {...engineLinkProps(name)}>
          {name}
        </EuiLink>
      ),
      width: '30%',
      truncateText: true,
      mobileOptions: {
        header: true,
        // Note: the below props are valid props per https://elastic.github.io/eui/#/tabular-content/tables (Responsive tables), but EUI's types have a bug reporting it as an error
        // @ts-ignore
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
      render: (dateString: string) => (
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
      render: (number: number) => <FormattedNumber value={number} />,
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
      render: (number: number) => <FormattedNumber value={number} />,
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
      render: (name: string) => (
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
      onChange={({ page }: IOnChange) => {
        const { index } = page;
        onPaginate(index + 1); // Note on paging - App Search's API pages start at 1, EuiBasicTables' pages start at 0
      }}
    />
  );
};
