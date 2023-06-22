/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { IndexPatternType } from '@kbn/io-ts-utils';
import { Dataset } from '../../common/datasets';
import { FindDatasetsRequestQuery, SortOrder } from '../../common/latest';
import { IDatasetsClient } from '../services/datasets';
import { createDatasetsStateMachine } from '../state_machines/datasets';

interface DatasetsContextDeps {
  datasetsClient: IDatasetsClient;
}

export interface SearchDatasetsParams {
  name: string;
  sortOrder: SortOrder;
}

export type SearchDatasets = (params: SearchDatasetsParams) => void;
export type LoadDatasets = () => void;
export type ReloadDatasets = () => void;

const useDatasets = ({ datasetsClient }: DatasetsContextDeps) => {
  const datasetsStateService = useInterpret(() =>
    createDatasetsStateMachine({
      datasetsClient,
    })
  );

  // const datasets = useSelector(datasetsStateService, (state) => state.context.datasets);
  const datasets = mockDatasets;

  const error = useSelector(datasetsStateService, (state) => state.context.error);

  const isLoading = useSelector(
    datasetsStateService,
    (state) => state.matches('loading') || state.matches('debounceSearchingDatasets')
  );

  const loadDatasets = useCallback(
    () => datasetsStateService.send({ type: 'LOAD_DATASETS' }),
    [datasetsStateService]
  );

  const reloadDatasets = useCallback(
    () => datasetsStateService.send({ type: 'RELOAD_DATASETS' }),
    [datasetsStateService]
  );

  const searchDatasets: SearchDatasets = useCallback(
    (searchParams) =>
      datasetsStateService.send({
        type: 'SEARCH_DATASETS',
        search: formatSearchParams(searchParams),
      }),
    [datasetsStateService]
  );

  const sortDatasets: SearchDatasets = useCallback(
    (searchParams) =>
      datasetsStateService.send({
        type: 'SORT_DATASETS',
        search: formatSearchParams(searchParams),
      }),
    [datasetsStateService]
  );

  return {
    // Underlying state machine
    datasetsStateService,

    // Failure states
    error,

    // Loading states
    isLoading,

    // Data
    datasets,

    // Actions
    loadDatasets,
    reloadDatasets,
    searchDatasets,
    sortDatasets,
  };
};

export const [DatasetsProvider, useDatasetsContext] = createContainer(useDatasets);

/**
 * Utils
 */
const formatSearchParams = ({
  name,
  ...params
}: SearchDatasetsParams): FindDatasetsRequestQuery => ({
  datasetQuery: name,
  ...params,
});
const mockDatasets: Dataset[] = [
  { name: 'logs-*' as IndexPatternType },
  { name: 'system-logs-*' as IndexPatternType },
  { name: 'nginx-logs-*' as IndexPatternType },
  { name: 'apache-logs-*' as IndexPatternType },
  { name: 'security-logs-*' as IndexPatternType },
  { name: 'error-logs-*' as IndexPatternType },
  { name: 'access-logs-*' as IndexPatternType },
  { name: 'firewall-logs-*' as IndexPatternType },
  { name: 'application-logs-*' as IndexPatternType },
  { name: 'debug-logs-*' as IndexPatternType },
  { name: 'transaction-logs-*' as IndexPatternType },
  { name: 'audit-logs-*' as IndexPatternType },
  { name: 'server-logs-*' as IndexPatternType },
  { name: 'database-logs-*' as IndexPatternType },
  { name: 'event-logs-*' as IndexPatternType },
  { name: 'auth-logs-*' as IndexPatternType },
  { name: 'billing-logs-*' as IndexPatternType },
  { name: 'network-logs-*' as IndexPatternType },
  { name: 'performance-logs-*' as IndexPatternType },
  { name: 'email-logs-*' as IndexPatternType },
  { name: 'job-logs-*' as IndexPatternType },
  { name: 'task-logs-*' as IndexPatternType },
  { name: 'user-logs-*' as IndexPatternType },
  { name: 'request-logs-*' as IndexPatternType },
  { name: 'payment-logs-*' as IndexPatternType },
  { name: 'inventory-logs-*' as IndexPatternType },
  { name: 'debugging-logs-*' as IndexPatternType },
  { name: 'scheduler-logs-*' as IndexPatternType },
  { name: 'diagnostic-logs-*' as IndexPatternType },
  { name: 'cluster-logs-*' as IndexPatternType },
  { name: 'service-logs-*' as IndexPatternType },
  { name: 'framework-logs-*' as IndexPatternType },
  { name: 'api-logs-*' as IndexPatternType },
  { name: 'load-balancer-logs-*' as IndexPatternType },
  { name: 'reporting-logs-*' as IndexPatternType },
  { name: 'backend-logs-*' as IndexPatternType },
  { name: 'frontend-logs-*' as IndexPatternType },
  { name: 'chat-logs-*' as IndexPatternType },
  { name: 'error-tracking-logs-*' as IndexPatternType },
  { name: 'payment-gateway-logs-*' as IndexPatternType },
  { name: 'auth-service-logs-*' as IndexPatternType },
  { name: 'billing-service-logs-*' as IndexPatternType },
  { name: 'database-service-logs-*' as IndexPatternType },
  { name: 'api-gateway-logs-*' as IndexPatternType },
  { name: 'event-service-logs-*' as IndexPatternType },
  { name: 'notification-service-logs-*' as IndexPatternType },
  { name: 'search-service-logs-*' as IndexPatternType },
  { name: 'logging-service-logs-*' as IndexPatternType },
  { name: 'performance-service-logs-*' as IndexPatternType },
  { name: 'load-testing-logs-*' as IndexPatternType },
  { name: 'mobile-app-logs-*' as IndexPatternType },
  { name: 'web-app-logs-*' as IndexPatternType },
  { name: 'stream-processing-logs-*' as IndexPatternType },
  { name: 'batch-processing-logs-*' as IndexPatternType },
  { name: 'cloud-service-logs-*' as IndexPatternType },
  { name: 'container-logs-*' as IndexPatternType },
  { name: 'serverless-logs-*' as IndexPatternType },
  { name: 'server-administration-logs-*' as IndexPatternType },
  { name: 'application-deployment-logs-*' as IndexPatternType },
  { name: 'webserver-logs-*' as IndexPatternType },
  { name: 'payment-processor-logs-*' as IndexPatternType },
  { name: 'inventory-service-logs-*' as IndexPatternType },
  { name: 'data-pipeline-logs-*' as IndexPatternType },
  { name: 'frontend-service-logs-*' as IndexPatternType },
  { name: 'backend-service-logs-*' as IndexPatternType },
  { name: 'resource-monitoring-logs-*' as IndexPatternType },
  { name: 'logging-aggregation-logs-*' as IndexPatternType },
  { name: 'container-orchestration-logs-*' as IndexPatternType },
  { name: 'security-audit-logs-*' as IndexPatternType },
  { name: 'api-management-logs-*' as IndexPatternType },
  { name: 'service-mesh-logs-*' as IndexPatternType },
  { name: 'data-processing-logs-*' as IndexPatternType },
  { name: 'data-science-logs-*' as IndexPatternType },
  { name: 'machine-learning-logs-*' as IndexPatternType },
  { name: 'experimentation-logs-*' as IndexPatternType },
  { name: 'data-visualization-logs-*' as IndexPatternType },
  { name: 'data-cleaning-logs-*' as IndexPatternType },
  { name: 'data-transformation-logs-*' as IndexPatternType },
  { name: 'data-analysis-logs-*' as IndexPatternType },
  { name: 'data-storage-logs-*' as IndexPatternType },
  { name: 'data-retrieval-logs-*' as IndexPatternType },
  { name: 'data-warehousing-logs-*' as IndexPatternType },
  { name: 'data-modeling-logs-*' as IndexPatternType },
  { name: 'data-integration-logs-*' as IndexPatternType },
  { name: 'data-quality-logs-*' as IndexPatternType },
  { name: 'data-security-logs-*' as IndexPatternType },
  { name: 'data-encryption-logs-*' as IndexPatternType },
  { name: 'data-governance-logs-*' as IndexPatternType },
  { name: 'data-compliance-logs-*' as IndexPatternType },
  { name: 'data-privacy-logs-*' as IndexPatternType },
  { name: 'data-auditing-logs-*' as IndexPatternType },
  { name: 'data-discovery-logs-*' as IndexPatternType },
  { name: 'data-protection-logs-*' as IndexPatternType },
  { name: 'data-archiving-logs-*' as IndexPatternType },
  { name: 'data-backup-logs-*' as IndexPatternType },
  { name: 'data-recovery-logs-*' as IndexPatternType },
  { name: 'data-replication-logs-*' as IndexPatternType },
  { name: 'data-synchronization-logs-*' as IndexPatternType },
  { name: 'data-migration-logs-*' as IndexPatternType },
  { name: 'data-load-balancing-logs-*' as IndexPatternType },
  { name: 'data-scaling-logs-*' as IndexPatternType },
].map((dataset) => Dataset.create({ dataset }));
