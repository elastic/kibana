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
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import {
  PAGE_SIZE,
  SortDirection,
  SortField,
} from '../service_overview_instances_chart_and_table';
import { OverviewTableContainer } from '../../../shared/overview_table_container';
import { getColumns } from './get_columns';
import { InstanceDetails } from './intance_details';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';

type ServiceInstanceMainStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics'>;
type MainStatsServiceInstanceItem =
  ServiceInstanceMainStatistics['currentPeriod'][0];
type ServiceInstanceDetailedStatistics =
  APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics'>;

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
  isNotInitiated: boolean;
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
  isNotInitiated,
}: Props) {
  const { agentName } = useApmServiceContext();

  const {
    query: { kuery, latencyAggregationType, comparisonEnabled },
  } = useApmParams('/services/{serviceName}');

  const [itemIdToOpenActionMenuRowMap, setItemIdToOpenActionMenuRowMap] =
    useState<Record<string, boolean>>({});

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
          kuery={kuery}
        />
      );
    }
    setItemIdToExpandedRowMap(expandedRowMapValues);
  };

  // Hide the spark plots if we're below 1600 px
  const { isXl } = useBreakpoints();
  const shouldShowSparkPlots = !isXl;

  const columns = getColumns({
    agentName,
    serviceName,
    kuery,
    latencyAggregationType: latencyAggregationType as LatencyAggregationType,
    detailedStatsData,
    comparisonEnabled,
    toggleRowDetails,
    itemIdToExpandedRowMap,
    toggleRowActionMenu,
    itemIdToOpenActionMenuRowMap,
    shouldShowSparkPlots,
  });

  const pagination = {
    pageIndex,
    pageSize: PAGE_SIZE,
    totalItemCount: mainStatsItemCount,
    showPerPageOptions: false,
  };

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      data-test-subj="serviceOverviewInstancesTable"
    >
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
        <OverviewTableContainer
          fixedHeight={true}
          isEmptyAndNotInitiated={mainStatsItemCount === 0 && isNotInitiated}
        >
          <EuiBasicTable
            noItemsMessage={
              isLoading
                ? i18n.translate('xpack.apm.serviceOverview.loadingText', {
                    defaultMessage: 'Loading…',
                  })
                : i18n.translate('xpack.apm.serviceOverview.noResultsText', {
                    defaultMessage: 'No instances found',
                  })
            }
            data-test-subj="instancesTable"
            loading={isLoading}
            items={mainStatsItems}
            columns={columns}
            pagination={pagination}
            sorting={{ sort: { field, direction } }}
            onChange={onChangeTableOptions}
            itemId="serviceNodeName"
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            error={
              status === FETCH_STATUS.FAILURE
                ? i18n.translate(
                    'xpack.apm.serviceOverview.instancesTable.errorMessage',
                    { defaultMessage: 'Failed to fetch' }
                  )
                : ''
            }
          />
        </OverviewTableContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
