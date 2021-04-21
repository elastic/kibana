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
import React from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { TableFetchWrapper } from '../../../shared/table_fetch_wrapper';
import {
  PAGE_SIZE,
  MainStatsServiceInstanceItem,
  SortDirection,
  SortField,
} from '../service_overview_instances_chart_and_table';
import { ServiceOverviewTableContainer } from '../service_overview_table_container';
import { getColumns } from './get_columns';

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

  const { pageIndex, sort } = tableOptions;
  const { direction, field } = sort;

  const columns = getColumns({
    agentName,
    serviceName,
    latencyAggregationType,
    detailedStatsData,
    comparisonEnabled,
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
      <EuiFlexItem>
        <TableFetchWrapper status={status}>
          <ServiceOverviewTableContainer
            isEmptyAndLoading={mainStatsItemCount === 0 && isLoading}
          >
            <EuiBasicTable
              loading={isLoading}
              items={mainStatsItems}
              columns={columns}
              pagination={pagination}
              sorting={{ sort: { field, direction } }}
              onChange={onChangeTableOptions}
            />
          </ServiceOverviewTableContainer>
        </TableFetchWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
