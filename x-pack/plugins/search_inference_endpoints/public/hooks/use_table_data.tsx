/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableSortingType } from '@elastic/eui';
import { Pagination } from '@elastic/eui';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useMemo } from 'react';
import { TaskTypes } from '../../common/types';
import { DEFAULT_TABLE_LIMIT } from '../components/all_inference_endpoints/constants';
import {
  FilterOptions,
  INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
  InferenceEndpointUI,
  QueryParams,
  SortOrder,
  ServiceProviderKeys,
} from '../components/all_inference_endpoints/types';
import { DeploymentStatusEnum } from '../components/all_inference_endpoints/types';
import { useTrainedModelStats } from './use_trained_model_stats';

interface UseTableDataReturn {
  tableData: InferenceEndpointUI[];
  sortedTableData: InferenceEndpointUI[];
  paginatedSortedTableData: InferenceEndpointUI[];
  pagination: Pagination;
  sorting: EuiTableSortingType<InferenceEndpointUI>;
}

export const useTableData = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  queryParams: QueryParams,
  filterOptions: FilterOptions,
  searchKey: string
): UseTableDataReturn => {
  const { data: trainedModelStats } = useTrainedModelStats();

  const deploymentStatus = trainedModelStats?.trained_model_stats.reduce((acc, modelStat) => {
    if (modelStat.model_id) {
      acc[modelStat.model_id] =
        modelStat?.deployment_stats?.state === 'started'
          ? DeploymentStatusEnum.deployed
          : DeploymentStatusEnum.notDeployed;
    }
    return acc;
  }, {} as Record<string, DeploymentStatusEnum>);

  const tableData: InferenceEndpointUI[] = useMemo(() => {
    let filteredEndpoints = inferenceEndpoints;

    if (filterOptions.provider.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.provider.includes(ServiceProviderKeys[endpoint.service])
      );
    }

    if (filterOptions.type.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.type.includes(TaskTypes[endpoint.task_type])
      );
    }

    return filteredEndpoints
      .filter((endpoint) => endpoint.inference_id.includes(searchKey))
      .map((endpoint) => {
        const isElasticService =
          endpoint.service === ServiceProviderKeys.elasticsearch ||
          endpoint.service === ServiceProviderKeys.elser;

        let deploymentStatusValue = DeploymentStatusEnum.notApplicable;
        if (isElasticService) {
          const modelId = endpoint.service_settings?.model_id;
          deploymentStatusValue =
            modelId && deploymentStatus?.[modelId]
              ? deploymentStatus[modelId]
              : DeploymentStatusEnum.notDeployable;
        }

        return {
          deployment: deploymentStatusValue,
          endpoint,
          provider: endpoint.service,
          type: endpoint.task_type,
        };
      });
  }, [inferenceEndpoints, searchKey, filterOptions, deploymentStatus]);

  const sortedTableData: InferenceEndpointUI[] = useMemo(() => {
    return [...tableData].sort((a, b) => {
      const aValue = a[queryParams.sortField];
      const bValue = b[queryParams.sortField];

      if (queryParams.sortOrder === SortOrder.asc) {
        return aValue.inference_id.localeCompare(bValue.inference_id);
      } else {
        return bValue.inference_id.localeCompare(aValue.inference_id);
      }
    });
  }, [tableData, queryParams]);

  const pagination: Pagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: inferenceEndpoints.length ?? 0,
    }),
    [inferenceEndpoints, queryParams]
  );

  const paginatedSortedTableData: InferenceEndpointUI[] = useMemo(() => {
    const pageSize = pagination.pageSize || DEFAULT_TABLE_LIMIT;
    const startIndex = pagination.pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedTableData.slice(startIndex, endIndex);
  }, [sortedTableData, pagination]);

  const sorting = useMemo(
    () => ({
      sort: {
        direction: queryParams.sortOrder,
        field: queryParams.sortField,
      },
    }),
    [queryParams.sortField, queryParams.sortOrder]
  );

  return { tableData, sortedTableData, paginatedSortedTableData, pagination, sorting };
};
