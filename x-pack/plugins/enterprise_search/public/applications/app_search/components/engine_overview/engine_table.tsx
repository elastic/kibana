/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import { EuiBasicTable, EuiLink } from '@elastic/eui';

import { sendTelemetry } from '../../../shared/telemetry';
import { KibanaContext, IKibanaContext } from '../../../index';

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
  const engineLinkProps = name => ({
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
      name: 'Name',
      render: name => <EuiLink {...engineLinkProps(name)}>{name}</EuiLink>,
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
      name: 'Created At',
      dataType: 'string',
      render: dateString => {
        // e.g., January 1, 1970
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      },
    },
    {
      field: 'document_count',
      name: 'Document Count',
      dataType: 'number',
      render: number => number.toLocaleString(), // Display with comma thousand separators
      truncateText: true,
    },
    {
      field: 'field_count',
      name: 'Field Count',
      dataType: 'number',
      render: number => number.toLocaleString(), // Display with comma thousand separators
      truncateText: true,
    },
    {
      field: 'name',
      name: 'Actions',
      dataType: 'string',
      render: name => <EuiLink {...engineLinkProps(name)}>Manage</EuiLink>,
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
        pageSize: 10, // TODO: pull this out to a constant?
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
