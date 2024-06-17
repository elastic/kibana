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
import { i18n } from '@kbn/i18n';
import {
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButton,
  EuiToolTip,
  EuiLink,
  type EuiDataGridSorting,
  type EuiDataGridCellValueElementProps,
} from '@elastic/eui';
import type { RenderCellValue, EuiDataGridColumn } from '@elastic/eui';

import type { Agent } from '../../../../types';
import { getKuery } from '../utils/get_kuery';

import { sendGetAgents, useLink } from '../../../../hooks';
import { useTableState } from '../hooks/use_table_state';

interface Props {
  showDataGridView: boolean;
  setDataGridView: (showDataGridView: boolean) => void;
}
const DEFAULT_PAGE_SIZE = 10;

export const BACK_TO_MAIN_VIEW = i18n.translate('xpack.fleet.agentsDataGridView.ButtonTooltip', {
  defaultMessage: 'Back to main view',
});

export const AgentsGridView: React.FunctionComponent<Props> = ({
  showDataGridView,
  setDataGridView,
}) => {
  const { getHref } = useLink();
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
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

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

  const onSort = useCallback(
    (newSortingColumns: EuiDataGridSorting['columns']) => {
      setSortingColumns(newSortingColumns);
    },
    [setSortingColumns]
  );

  const formatData = useCallback(
    (data: any, path: string) => {
      if (typeof data === 'boolean') {
        return `${data}`;
      } else if (typeof data === 'string' && (path === 'last_checkin' || path === 'enrolled_at')) {
        return moment.utc(data).format('DD/MM/YYYY HH:mm:ss UTC');
      } else if (typeof data === 'string' && path === 'id') {
        return <EuiLink href={getHref('agent_details', { agentId: data })}>{data}</EuiLink>;
      } else if (typeof data === 'string' && path === 'policy_id') {
        return <EuiLink href={getHref('policy_details', { policyId: data })}>{data}</EuiLink>;
      }
      return data;
    },
    [getHref]
  );

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
    ];
    return agents.map((agent) => {
      const row: { [key: string]: string } = {};
      if (!!agent) {
        keysToDisplay.forEach((path) => {
          const regex = path.match(/(\.?)(\w+$)/);
          const key = regex ? regex[2] : path;
          const value = get(agent, path);
          const formatted = formatData(value, path);
          Object.assign(row, { [key]: formatted });
        });
        return row;
      }
    });
  }, [agents, formatData]);

  const getRenderCellValue: RenderCellValue = ({
    rowIndex,
    columnId,
    setCellProps,
  }: EuiDataGridCellValueElementProps) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (
        columnId === 'status' &&
        agentsDataForGrid.hasOwnProperty(rowIndex) &&
        agentsDataForGrid[rowIndex][columnId] === 'online'
      ) {
        setCellProps({
          style: {
            backgroundColor: `#6dccb1`,
          },
        });
      }
      if (
        columnId === 'status' &&
        agentsDataForGrid.hasOwnProperty(rowIndex) &&
        agentsDataForGrid[rowIndex][columnId] === 'unhealthy'
      ) {
        setCellProps({
          style: {
            backgroundColor: `#f1d86f`,
          },
        });
      }
    }, [rowIndex, columnId, setCellProps]);
    return agentsDataForGrid &&
      agentsDataForGrid.hasOwnProperty(rowIndex) &&
      agentsDataForGrid[rowIndex][columnId]
      ? agentsDataForGrid[rowIndex][columnId]
      : null;
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={BACK_TO_MAIN_VIEW} position="top">
            <EuiButtonIcon
              display="base"
              iconType="arrowLeft"
              size="m"
              aria-label="Back"
              onClick={() => setDataGridView(!showDataGridView)}
            />
          </EuiToolTip>
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
          sorting={{ columns: sortingColumns, onSort }}
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
