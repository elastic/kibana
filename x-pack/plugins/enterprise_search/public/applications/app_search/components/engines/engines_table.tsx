/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions } from 'kea';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { FormattedMessage, FormattedDate, FormattedNumber } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { TelemetryLogic } from '../../../shared/telemetry';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { getEngineRoute } from '../../routes';

import { ENGINES_PAGE_SIZE } from '../../../../../common/constants';

interface EnginesTableData {
  name: string;
  created_at: string;
  document_count: number;
  field_count: number;
}
interface EnginesTablePagination {
  totalEngines: number;
  pageIndex: number;
  onPaginate(pageIndex: number): void;
}
interface EnginesTableProps {
  data: EnginesTableData[];
  pagination: EnginesTablePagination;
}
interface OnChange {
  page: {
    index: number;
  };
}

export const EnginesTable: React.FC<EnginesTableProps> = ({
  data,
  pagination: { totalEngines, pageIndex, onPaginate },
}) => {
  const { sendAppSearchTelemetry } = useActions(TelemetryLogic);

  const engineLinkProps = (name: string) => ({
    to: getEngineRoute(name),
    onClick: () =>
      sendAppSearchTelemetry({
        action: 'clicked',
        metric: 'engine_table_link',
      }),
  });

  const columns: Array<EuiBasicTableColumn<EnginesTableData>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.enterpriseSearch.appSearch.enginesOverview.table.column.name', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => (
        <EuiLinkTo data-test-subj="engineNameLink" {...engineLinkProps(name)}>
          {name}
        </EuiLinkTo>
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
        // e.g., Jan 1, 1970
        <FormattedDate value={new Date(dateString)} year="numeric" month="short" day="numeric" />
      ),
    },
    {
      field: 'language',
      name: i18n.translate(
        'xpack.enterpriseSearch.appSearch.enginesOverview.table.column.language',
        {
          defaultMessage: 'Language',
        }
      ),
      dataType: 'string',
      render: (language: string) => (
        <FormattedMessage
          id="xpack.enterpriseSearch.appSearch.enginesOverview.table.column.language"
          defaultMessage={language}
        />
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
        <EuiLinkTo {...engineLinkProps(name)}>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.enginesOverview.table.action.manage"
            defaultMessage="Manage"
          />
        </EuiLinkTo>
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
      onChange={({ page }: OnChange) => {
        const { index } = page;
        onPaginate(index + 1); // Note on paging - App Search's API pages start at 1, EuiBasicTables' pages start at 0
      }}
    />
  );
};
