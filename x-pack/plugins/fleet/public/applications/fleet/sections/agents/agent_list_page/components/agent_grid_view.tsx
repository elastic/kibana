/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash';
import moment from 'moment';
import { EuiDataGrid, EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiButton } from '@elastic/eui';
import type { RenderCellValue, EuiDataGridColumn } from '@elastic/eui';

import type { Agent } from '../../../../types';

import { sendGetAgents } from '../../../../hooks'; // usePagination
import { useTableState } from '../hooks/use_table_state';

interface Props {
  showDataGridView: boolean;
  setDataGridView: (showDataGridView: boolean) => void;
}

export const AgentsGridView: React.FunctionComponent<Props> = ({
  showDataGridView,
  setDataGridView,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const { showInactive, showUpgradeable, draftKuery } = useTableState();

  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number } | undefined>(
    { pageIndex: 1, pageSize: 10 }
  );

  const columns: EuiDataGridColumn[] = [
    {
      id: 'id',
      displayAsText: 'Id',
      defaultSortDirection: 'asc',
    },
    {
      id: 'hostname',
      displayAsText: 'Hostname',
      defaultSortDirection: 'asc',
    },
    {
      id: 'status',
      displayAsText: 'Status',
      defaultSortDirection: 'asc',
    },
    {
      id: 'active',
      displayAsText: 'Active',
      defaultSortDirection: 'asc',
    },
    {
      id: 'last_checkin',
      displayAsText: 'Last Checkin',
      defaultSortDirection: 'asc',
    },
    {
      id: 'enrolled_at',
      displayAsText: 'Enrolled At',
      defaultSortDirection: 'asc',
    },
    {
      id: 'policy_id',
      displayAsText: 'Policy Id',
      defaultSortDirection: 'asc',
    },
    {
      id: 'version',
      displayAsText: 'Version',
      defaultSortDirection: 'asc',
    },
    {
      id: 'upgradeable',
      displayAsText: 'Upgradeable',
      defaultSortDirection: 'asc',
    },
    {
      id: 'platform',
      displayAsText: 'Platform',
      defaultSortDirection: 'asc',
    },
    // {
    //   id: 'cpu_avg',
    //   displayAsText: 'CPU',
    //   defaultSortDirection: 'asc',
    // },
    // {
    //   id: 'memory_size_byte_avg',
    //   displayAsText: 'Memory',
    //   defaultSortDirection: 'asc',
    // },
  ];
  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination(() => ({
        ...pagination,
        pageSize,
        pageIndex: 0,
      })),
    [pagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination(() => ({ ...pagination, pageIndex })),
    [pagination]
  );

  const fetchAgents = useCallback(async () => {
    try {
      const agentsResponse = await sendGetAgents({
        page: pagination?.pageIndex,
        perPage: pagination?.pageSize,
        kuery: draftKuery, // fix it
        showInactive,
        showUpgradeable,
        getStatusSummary: false,
        withMetrics: true,
      });
      setAgents(agentsResponse?.data?.items ?? []);
    } catch (err) {
      console.log(err);
    }
  }, [draftKuery, pagination.pageIndex, pagination.pageSize, showInactive, showUpgradeable]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const [visibleColumns, setVisibleColumns] = useState(
    columns.map(({ id }) => id) // initialize to the full set of columns
  );

  const formatData = (data: any) => {
    const dateRe = /\d{4}\-\d{2}\-\d{2}[T]\d{2}\:\d{2}:\d{2}[Z]/;
    if (typeof data === 'boolean') {
      return `${data}`;
    } else if (typeof data === 'string' && data.match(dateRe)) {
      return moment(data).toISOString();
    }
    return data;
  };

  const agentsDataForGrid = useMemo(() => {
    const keysToDisplay = [
      'id',
      'local_metadata.host.hostname',
      'status',
      'active',
      'last_checkin',
      'enrolled_at',
      'policy_id',
      'local_metadata.elastic.agent.version',
      'local_metadata.elastic.agent.upgradeable',
      'local_metadata.os.platform',
      // 'local_metadata.host.metrics.cpu_avg',
      // 'local_metadata.host.metrics.memory_size_byte_avg',
    ];
    return agents.map((agent) => {
      const row: { [key: string]: string } = {};
      if (!!agent) {
        keysToDisplay.forEach((path) => {
          const regex = path.match(/(\.?)(\w+$)/);
          const key = regex ? regex[2] : path;
          const value = get(agent, path);
          const formatted = formatData(value);
          Object.assign(row, { [key]: formatted });
        });
        return row;
      }
    });
  }, [agents]);

  const getRenderCellValue: RenderCellValue = ({
    rowIndex,
    columnId,
  }: {
    rowIndex: number;
    columnId: string;
  }) => {
    return agentsDataForGrid &&
      !!agentsDataForGrid[rowIndex] &&
      !!agentsDataForGrid[rowIndex][columnId]
      ? agentsDataForGrid[rowIndex][columnId]
      : null;
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            display="base"
            iconType="arrowLeft"
            size="m"
            aria-label="Back"
            onClick={() => setDataGridView(!showDataGridView)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            key="reloadButton"
            color="primary"
            iconType="refresh"
            onClick={() => fetchAgents()}
          >
            <FormattedMessage
              id="xpack.fleet.agentsDataGridView.reloadButton"
              defaultMessage="Reload"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <EuiDataGrid
          aria-label="Agent data grid view"
          columns={columns}
          columnVisibility={{ visibleColumns, setVisibleColumns }}
          rowCount={agentsDataForGrid.length}
          renderCellValue={getRenderCellValue}
          inMemory={{ level: 'sorting' }}
          // pagination={{
          //   ...pagination,
          //   onChangeItemsPerPage,
          //   onChangePage,
          // }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
