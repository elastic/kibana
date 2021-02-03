/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { find } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBasicTableProps,
  EuiTableSelectionType,
  EuiHealth,
} from '@elastic/eui';

import { useAllAgents } from './use_all_agents';
import { Direction } from '../../common/search_strategy';
import { Agent } from '../../common/shared_imports';

interface AgentsTableProps {
  selectedAgents: string[];
  onChange: (payload: string[]) => void;
}

const AgentsTableComponent: React.FC<AgentsTableProps> = ({ selectedAgents, onChange }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<keyof Agent>('id');
  const [sortDirection, setSortDirection] = useState<Direction>(Direction.asc);
  const [selectedItems, setSelectedItems] = useState([]);
  const tableRef = useRef<EuiBasicTable<Agent>>(null);

  const onTableChange: EuiBasicTableProps<Agent>['onChange'] = useCallback(
    ({ page = {}, sort = {} }) => {
      const { index: newPageIndex, size: newPageSize } = page;

      const { field: newSortField, direction: newSortDirection } = sort;

      setPageIndex(newPageIndex);
      setPageSize(newPageSize);
      setSortField(newSortField);
      setSortDirection(newSortDirection);
    },
    []
  );

  const onSelectionChange: EuiTableSelectionType<{}>['onSelectionChange'] = useCallback(
    (newSelectedItems) => {
      setSelectedItems(newSelectedItems);
      // @ts-expect-error
      onChange(newSelectedItems.map((item) => item._id));
    },
    [onChange]
  );

  const renderStatus = (online: string) => {
    const color = online ? 'success' : 'danger';
    const label = online ? 'Online' : 'Offline';
    return <EuiHealth color={color}>{label}</EuiHealth>;
  };

  const [, { agents, totalCount }] = useAllAgents({
    activePage: pageIndex,
    limit: pageSize,
    direction: sortDirection,
    sortField,
  });

  const columns: Array<EuiBasicTableColumn<{}>> = useMemo(
    () => [
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
        render: (active: string) => renderStatus(active),
      },
    ],
    []
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: totalCount,
      pageSizeOptions: [3, 5, 8],
    }),
    [pageIndex, pageSize, totalCount]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    }),
    [sortDirection, sortField]
  );

  const selection: EuiBasicTableProps<Agent>['selection'] = useMemo(
    () => ({
      selectable: (agent: Agent) => agent.active,
      selectableMessage: (selectable: boolean) => (!selectable ? 'User is currently offline' : ''),
      onSelectionChange,
      initialSelected: selectedItems,
    }),
    [onSelectionChange, selectedItems]
  );

  useEffect(() => {
    if (selectedAgents?.length && agents.length && selectedItems.length !== selectedAgents.length) {
      tableRef?.current?.setSelection(
        // @ts-expect-error
        selectedAgents.map((agentId) => find({ _id: agentId }, agents))
      );
    }
  }, [selectedAgents, agents, selectedItems.length]);

  return (
    <EuiBasicTable<Agent>
      ref={tableRef}
      items={agents}
      itemId="_id"
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

export const AgentsTable = React.memo(AgentsTableComponent);
