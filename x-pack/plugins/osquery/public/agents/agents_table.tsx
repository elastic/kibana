/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-shadow */

import React, { useState, useRef } from 'react';
import { EuiBasicTable, EuiHealth } from '@elastic/eui';

import { useAllAgents } from './use_all_agents';

export const AgentsTable = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState('firstName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedItems, setSelectedItems] = useState([]);
  const tableRef = useRef();

  const onTableChange = ({ page = {}, sort = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    const { field: sortField, direction: sortDirection } = sort;

    setPageIndex(pageIndex);
    setPageSize(pageSize);
    setSortField(sortField);
    setSortDirection(sortDirection);
  };

  const onSelectionChange = (selectedItems) => {
    setSelectedItems(selectedItems);
  };

  const renderStatus = (online) => {
    const color = online ? 'success' : 'danger';
    const label = online ? 'Online' : 'Offline';
    return <EuiHealth color={color}>{label}</EuiHealth>;
  };

  const [, { agents, totalCount }] = useAllAgents({
    activePage: pageIndex,
    limit: pageSize,
    direction: sortDirection,
    field: sortField,
  });

  const columns = [
    {
      field: 'local_metadata.elastic.agent.id',
      name: 'id',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'local_metadata.host.name',
      name: 'hostname',
      truncateText: true,
    },

    {
      field: 'active',
      name: 'Online',
      dataType: 'boolean',
      render: (active) => renderStatus(active),
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: totalCount,
    pageSizeOptions: [3, 5, 8],
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const selection = {
    selectable: (agent) => agent.active,
    selectableMessage: (selectable) => (!selectable ? 'User is currently offline' : undefined),
    onSelectionChange,
    initialSelected: [],
  };

  return (
    <EuiBasicTable
      ref={tableRef}
      items={agents}
      itemId="id"
      columns={columns}
      pagination={pagination}
      sorting={sorting}
      isSelectable={true}
      selection={selection}
      onChange={onTableChange}
      rowHeader="firstName"
    />
  );
};
