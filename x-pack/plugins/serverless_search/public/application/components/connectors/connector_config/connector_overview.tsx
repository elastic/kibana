/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer, Pagination } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  Connector,
  ConnectorStatus,
  pageToPagination,
  SyncJobsTable,
} from '@kbn/search-connectors';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useConnector } from '../../../hooks/api/use_connector';
import { useSyncJobs } from '../../../hooks/api/use_sync_jobs';
import { useShowErrorToast } from '../../../hooks/use_error_toast';
import { useKibanaServices } from '../../../hooks/use_kibana';
import { SyncScheduledCallOut } from './sync_scheduled_callout';

interface ConnectorOverviewProps {
  connector: Connector;
}

export const ConnectorOverview: React.FC<ConnectorOverviewProps> = ({ connector }) => {
  const { http } = useKibanaServices();
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);
  const showErrorToast = useShowErrorToast();
  const { data, isLoading, isSuccess, mutate } = useMutation({
    mutationFn: async () => {
      await http.post(`/internal/serverless_search/connectors/${connector.id}/sync`);
    },
    onError: (error) =>
      showErrorToast(
        error,
        i18n.translate('xpack.serverlessSearch.connectors.config.connectorSyncError', {
          defaultMessage: 'Error scheduling sync',
        })
      ),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, { connector: { ...connector, index_name: data } });
      queryClient.invalidateQueries(queryKey);
    },
  });

  const [pagination, setPagination] = useState<Omit<Pagination, 'totalItemCount'>>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data: syncJobsData, isLoading: syncJobsLoading } = useSyncJobs(connector.id, pagination);

  return (
    <>
      <EuiSpacer />
      <SyncJobsTable
        isLoading={syncJobsLoading}
        onPaginate={({ page }) => setPagination({ pageIndex: page.index, pageSize: page.size })}
        pagination={
          syncJobsData
            ? pageToPagination(syncJobsData?._meta.page)
            : { pageIndex: 0, pageSize: 20, totalItemCount: 0 }
        }
        syncJobs={syncJobsData?.data || []}
        type="content"
      />
      <EuiSpacer />
      <span>
        <EuiButton
          color="primary"
          disabled={
            ![ConnectorStatus.CONFIGURED, ConnectorStatus.CONNECTED].includes(connector.status)
          }
          fill
          isLoading={isLoading}
          onClick={() => mutate()}
        >
          {i18n.translate('xpack.serverlessSearch.connectors.config.syncLabel', {
            defaultMessage: 'Sync',
          })}
        </EuiButton>
      </span>
      {isSuccess && (
        <>
          <EuiSpacer />
          <SyncScheduledCallOut />
        </>
      )}
    </>
  );
};
