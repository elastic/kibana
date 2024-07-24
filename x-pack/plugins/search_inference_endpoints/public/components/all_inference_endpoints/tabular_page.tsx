/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import * as i18n from '../../../common/translations';

import { useTableData } from '../../hooks/use_table_data';
import { FilterOptions } from './types';

import { DeploymentStatusEnum } from './types';

import { useAllInferenceEndpointsState } from '../../hooks/use_all_inference_endpoints_state';
import { EndpointsTable } from './endpoints_table';
import { ServiceProviderFilter } from './filter/service_provider_filter';
import { TaskTypeFilter } from './filter/task_type_filter';
import { TableSearch } from './search/table_search';
import { useTableColumns } from './render_table_columns/table_columns';
import { useKibana } from '../../hooks/use_kibana';

interface TabularPageProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
}

export const TabularPage: React.FC<TabularPageProps> = ({ inferenceEndpoints }) => {
  const [searchKey, setSearchKey] = React.useState('');
  const [deploymentStatus, setDeploymentStatus] = React.useState<
    Record<string, DeploymentStatusEnum>
  >({});
  const { queryParams, setQueryParams, filterOptions, setFilterOptions } =
    useAllInferenceEndpointsState();

  const {
    services: { ml, notifications },
  } = useKibana();

  const onFilterChangedCallback = useCallback(
    (newFilterOptions: Partial<FilterOptions>) => {
      setFilterOptions(newFilterOptions);
    },
    [setFilterOptions]
  );

  useEffect(() => {
    const fetchDeploymentStatus = async () => {
      const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();
      if (trainedModelStats) {
        const newDeploymentStatus = trainedModelStats?.trained_model_stats.reduce(
          (acc, modelStat) => {
            if (modelStat.model_id) {
              acc[modelStat.model_id] =
                modelStat?.deployment_stats?.state === 'started'
                  ? DeploymentStatusEnum.deployed
                  : DeploymentStatusEnum.notDeployed;
            }
            return acc;
          },
          {} as Record<string, DeploymentStatusEnum>
        );
        setDeploymentStatus(newDeploymentStatus);
      }
    };

    fetchDeploymentStatus().catch((error) => {
      const errorObj = extractErrorProperties(error);
      notifications?.toasts?.addError(errorObj.message ? new Error(error.message) : error, {
        title: i18n.TRAINED_MODELS_STAT_GATHER_FAILED,
      });
    });
  }, [ml, notifications]);

  const { paginatedSortedTableData, pagination, sorting } = useTableData(
    inferenceEndpoints,
    queryParams,
    filterOptions,
    searchKey,
    deploymentStatus
  );

  const tableColumns = useTableColumns();

  const handleTableChange = useCallback(
    ({ page, sort }) => {
      const newQueryParams = {
        ...queryParams,
        ...(sort && {
          sortField: sort.field,
          sortOrder: sort.direction,
        }),
        ...(page && {
          page: page.index + 1,
          perPage: page.size,
        }),
      };
      setQueryParams(newQueryParams);
    },
    [queryParams, setQueryParams]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem style={{ width: '400px' }} grow={false}>
            <TableSearch searchKey={searchKey} setSearchKey={setSearchKey} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ServiceProviderFilter
              optionKeys={filterOptions.provider}
              onChange={onFilterChangedCallback}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TaskTypeFilter optionKeys={filterOptions.type} onChange={onFilterChangedCallback} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EndpointsTable
          columns={tableColumns}
          data={paginatedSortedTableData}
          onChange={handleTableChange}
          pagination={pagination}
          sorting={sorting}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
