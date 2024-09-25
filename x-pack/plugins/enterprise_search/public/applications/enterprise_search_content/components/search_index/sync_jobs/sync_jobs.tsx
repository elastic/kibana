/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import { Connector, SyncJobsTable } from '@kbn/search-connectors';

import { KibanaLogic } from '../../../../shared/kibana';

import { hasDocumentLevelSecurityFeature } from '../../../utils/connector_helpers';

import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from '../components/access_control_index_selector/access_control_index_selector';

import { SyncJobsViewLogic } from './sync_jobs_view_logic';

export interface SyncJobsProps {
  connector: Connector;
}

export const SyncJobs: React.FC<SyncJobsProps> = ({ connector }) => {
  const { productFeatures } = useValues(KibanaLogic);
  const shouldShowAccessSyncs =
    productFeatures.hasDocumentLevelSecurityEnabled && hasDocumentLevelSecurityFeature(connector);
  const errorOnAccessSync = Boolean(connector.last_access_control_sync_error);
  const errorOnContentSync = Boolean(connector.last_sync_error);
  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const {
    connectorId,
    syncJobsPagination: pagination,
    syncJobs,
    cancelSyncJobLoading,
    syncJobToCancel,
    selectedSyncJobCategory,
    syncTriggeredLocally,
  } = useValues(SyncJobsViewLogic);
  const {
    setConnectorId,
    fetchSyncJobs,
    cancelSyncJob,
    setCancelSyncJob,
    setSelectedSyncJobCategory,
  } = useActions(SyncJobsViewLogic);

  useEffect(() => {
    setConnectorId(connector.id);
  }, [connector]);

  useEffect(() => {
    if (connectorId) {
      fetchSyncJobs({
        connectorId,
        from: pagination.pageIndex * (pagination.pageSize || 0),
        size: pagination.pageSize ?? 10,
        type: selectedSyncJobCategory,
      });
    }
  }, [connectorId, selectedSyncJobCategory]);

  useEffect(() => {
    if (selectedIndexType === 'content-index') {
      setSelectedSyncJobCategory('content');
    } else {
      setSelectedSyncJobCategory('access_control');
    }
  }, [selectedIndexType]);

  return (
    <>
      {shouldShowAccessSyncs && (
        <>
          <AccessControlIndexSelector
            onChange={setSelectedIndexType}
            valueOfSelected={selectedIndexType}
            contentIndexTitle={'Content syncs'}
            contentIndexDescription={'Browse content syncs'}
            accessControlIndexTitle={'Access control syncs'}
            accessControlIndexDescription={'Browse document level security syncs'}
            contentSyncError={errorOnContentSync ? true : false}
            accessSyncError={errorOnAccessSync ? true : false}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {selectedSyncJobCategory === 'content' ? (
        <SyncJobsTable
          isLoading={syncTriggeredLocally}
          onPaginate={({ page: { index, size } }) => {
            if (connectorId) {
              fetchSyncJobs({
                connectorId,
                from: index * size,
                size,
                type: selectedSyncJobCategory,
              });
            }
          }}
          pagination={pagination}
          syncJobs={syncJobs}
          type="content"
          cancelConfirmModalProps={{
            isLoading: cancelSyncJobLoading,
            onConfirmCb: (syncJobId: string) => {
              cancelSyncJob({ syncJobId });
            },
            setSyncJobIdToCancel: setCancelSyncJob,
            syncJobIdToCancel: syncJobToCancel ?? undefined,
          }}
        />
      ) : (
        <SyncJobsTable
          isLoading={syncTriggeredLocally}
          onPaginate={({ page: { index, size } }) => {
            if (connectorId) {
              fetchSyncJobs({
                connectorId,
                from: index * size,
                size,
                type: 'access_control',
              });
            }
          }}
          cancelConfirmModalProps={{
            isLoading: cancelSyncJobLoading,
            onConfirmCb: (syncJobId: string) => {
              cancelSyncJob({ syncJobId });
            },
            setSyncJobIdToCancel: setCancelSyncJob,
            syncJobIdToCancel: syncJobToCancel ?? undefined,
          }}
          pagination={pagination}
          syncJobs={syncJobs}
          type="access_control"
        />
      )}
    </>
  );
};
