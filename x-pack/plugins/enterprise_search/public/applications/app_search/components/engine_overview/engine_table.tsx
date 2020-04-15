/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiLink } from '@elastic/eui';

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
  appSearchUrl: string;
}

export const EngineTable: ReactFC<IEngineTableProps> = ({
  data,
  pagination: { totalEngines, pageIndex = 0, onPaginate },
  appSearchUrl,
}) => {
  const columns = [
    {
      field: 'name',
      name: 'Name',
      render: name => (
        <EuiLink href={`${appSearchUrl}/as/engines/${name}`} target="_blank">
          {name}
        </EuiLink>
      ),
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
      render: name => (
        <EuiLink href={`${appSearchUrl}/as/engines/${name}`} target="_blank" color="primary">
          Manage
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
        pageSize: 10, // TODO: pull this out to a constant?
        totalItemCount: totalEngines,
        hidePerPageOptions: true,
      }}
      onChange={({ page = {} }) => {
        const { index } = page;
        onPaginate(index + 1); // Note on paging - App Search's API pages start at 1, EuiBasicTables' pages start at 0
      }}
    />
  );
};
