/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactNode, useEffect, useState } from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import {
  PAGE_SIZE,
  SortDirection,
  SortField,
} from '../service_overview_instances_chart_and_table';
import { OverviewTableContainer } from '../../../shared/overview_table_container';
import { getColumns } from './get_columns';
import { InstanceDetails } from './intance_details';

type ServiceInstanceMainStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type MainStatsServiceInstanceItem = ServiceInstanceMainStatistics['currentPeriod'][0];
type ServiceInstanceDetailedStatistics = APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;

export interface TableOptions {
  pageIndex: number;
  sort: {
    direction: SortDirection;
    field: SortField;
  };
}

interface Props {
  mainStatsItems: MainStatsServiceInstanceItem[];
  serviceName: string;
  mainStatsStatus: FETCH_STATUS;
  mainStatsItemCount: number;
  tableOptions: TableOptions;
  onChangeTableOptions: (newTableOptions: {
    page?: { index: number };
    sort?: { field: string; direction: SortDirection };
  }) => void;
  detailedStatsData?: ServiceInstanceDetailedStatistics;
  isLoading: boolean;
}
export function ServiceOverviewInstancesTable({
  mainStatsItems = [],
  mainStatsItemCount,
  serviceName,
  mainStatsStatus: status,
  tableOptions,
  onChangeTableOptions,
  detailedStatsData: detailedStatsData,
  isLoading,
}: Props) {
  const { agentName } = useApmServiceContext();
  const {
    urlParams: { latencyAggregationType, comparisonEnabled },
  } = useUrlParams();

  const [
    itemIdToOpenActionMenuRowMap,
    setItemIdToOpenActionMenuRowMap,
  ] = useState<Record<string, boolean>>({});

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, ReactNode>
  >({});

  useEffect(() => {
    // Closes any open rows when fetching new items
    setItemIdToExpandedRowMap({});
  }, [status]);

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const toggleRowActionMenu = (selectedServiceNodeName: string) => {
    const actionMenuRowMapValues = { ...itemIdToOpenActionMenuRowMap };
    if (actionMenuRowMapValues[selectedServiceNodeName]) {
      delete actionMenuRowMapValues[selectedServiceNodeName];
    } else {
      actionMenuRowMapValues[selectedServiceNodeName] = true;
    }
    setItemIdToOpenActionMenuRowMap(actionMenuRowMapValues);
  };

  const toggleRowDetails = (selectedServiceNodeName: string) => {
    const expandedRowMapValues = { ...itemIdToExpandedRowMap };
    if (expandedRowMapValues[selectedServiceNodeName]) {
      delete expandedRowMapValues[selectedServiceNodeName];
    } else {
      expandedRowMapValues[selectedServiceNodeName] = (
        <InstanceDetails
          serviceNodeName={selectedServiceNodeName}
          serviceName={serviceName}
        />
      );
    }
    setItemIdToExpandedRowMap(expandedRowMapValues);
  };

  const columns = getColumns({
    agentName,
    serviceName,
    latencyAggregationType,
    detailedStatsData,
    comparisonEnabled,
    toggleRowDetails,
    itemIdToExpandedRowMap,
    toggleRowActionMenu,
    itemIdToOpenActionMenuRowMap,
  });

  const pagination = {
    pageIndex,
    pageSize: PAGE_SIZE,
    totalItemCount: mainStatsItemCount,
    hidePerPageOptions: true,
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('xpack.apm.serviceOverview.instancesTableTitle', {
              defaultMessage: 'Instances',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="serviceInstancesTableContainer">
        <TableFetchWrapper status={status}>
          <OverviewTableContainer
            isEmptyAndLoading={mainStatsItemCount === 0 && isLoading}
          >
            <EuiBasicTable
              data-test-subj="instancesTable"
              loading={isLoading}
              items={mainStatsItems}
              columns={columns}
              pagination={pagination}
              sorting={{ sort: { field, direction } }}
              onChange={onChangeTableOptions}
              itemId="serviceNodeName"
              itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            />
          </OverviewTableContainer>
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
