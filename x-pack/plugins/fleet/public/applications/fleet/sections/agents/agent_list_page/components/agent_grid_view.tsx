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
import { getKuery } from '../utils/get_kuery';

import { sendGetAgents } from '../../../../hooks'; // usePagination
import { useTableState } from '../hooks/use_table_state';

interface Props {
  showDataGridView: boolean;
  setDataGridView: (showDataGridView: boolean) => void;
}
const DEFAULT_PAGE_SIZE = 10;

export const AgentsGridView: React.FunctionComponent<Props> = ({
  showDataGridView,
  setDataGridView,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const { showInactive, showUpgradeable, selectedStatus } = useTableState();

  const kuery = useMemo(() => {
    return getKuery({
      selectedStatus,
    });
  }, [selectedStatus]);

  const [pagination, setPagination] = useState<{ pageIndex: number; pageSize: number }>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

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
      id: 'version',
      displayAsText: 'Version',
      defaultSortDirection: 'asc',
      initialWidth: 70,
    },
    {
      id: 'status',
      displayAsText: 'Status',
      defaultSortDirection: 'asc',
      initialWidth: 80,
    },
    {
      id: 'active',
      displayAsText: 'Active',
      defaultSortDirection: 'asc',
      initialWidth: 80,
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
      id: 'upgradeable',
      displayAsText: 'Upgradeable',
      defaultSortDirection: 'asc',
      initialWidth: 100,
    },
    {
      id: 'platform',
      displayAsText: 'Platform',
      defaultSortDirection: 'asc',
      initialWidth: 80,
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
    (pageSize) => setPagination((p) => ({ ...p, pageSize, pageIndex: 0 })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((p) => ({ ...p, pageIndex })),
    [setPagination]
  );

  const fetchAgents = useCallback(async () => {
    try {
      const agentsResponse = await sendGetAgents({
        page: pagination.pageIndex + 1,
        perPage: pagination.pageSize,
        kuery,
        showInactive,
        showUpgradeable,
        getStatusSummary: false,
        withMetrics: true,
      });
      setAgents(agentsResponse?.data?.items ?? []);
    } catch (err) {
      throw err;
    }
  }, [kuery, pagination.pageIndex, pagination.pageSize, showInactive, showUpgradeable]);

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
      return moment.utc(data).format('DD/MM/YYYY HH:mm:ss UTC');
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
    if (
      !agentsDataForGrid ||
      agentsDataForGrid.length === 0 ||
      !agentsDataForGrid[rowIndex] ||
      !agentsDataForGrid[rowIndex][columnId]
    )
      return null;
    return agentsDataForGrid[rowIndex][columnId];
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
      <EuiFlexItem style={{ minWidth: 120 }} grow={false}>
        <EuiDataGrid
          aria-label="Agent data grid view"
          data-test-subj="agentsDataGrid"
          columns={columns}
          columnVisibility={{ visibleColumns, setVisibleColumns }}
          rowCount={agentsDataForGrid.length}
          renderCellValue={getRenderCellValue}
          inMemory={{ level: 'sorting' }}
          pagination={{
            ...pagination,
            pageSizeOptions: [DEFAULT_PAGE_SIZE, 20, 50],
            onChangeItemsPerPage,
            onChangePage,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
