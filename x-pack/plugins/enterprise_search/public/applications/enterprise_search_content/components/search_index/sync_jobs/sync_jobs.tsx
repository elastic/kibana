/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector, SyncJobsTable } from '@kbn/search-connectors';

import { KibanaLogic } from '../../../../shared/kibana';

import { hasDocumentLevelSecurityFeature } from '../../../utils/connector_helpers';

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

  return (
    <>
      {shouldShowAccessSyncs && (
        <EuiButtonGroup
          legend={i18n.translate(
            'xpack.enterpriseSearch.content.syncJobs.lastSync.tableSelector.legend',
            { defaultMessage: 'Select sync job type to display.' }
          )}
          name={i18n.translate(
            'xpack.enterpriseSearch.content.syncJobs.lastSync.tableSelector.name',
            { defaultMessage: 'Sync job type' }
          )}
          idSelected={selectedSyncJobCategory}
          onChange={(optionId) => {
            if (optionId === 'content' || optionId === 'access_control') {
              setSelectedSyncJobCategory(optionId);
            }
          }}
          options={[
            {
              id: 'content',
              label: i18n.translate(
                'xpack.enterpriseSearch.content.syncJobs.lastSync.tableSelector.content.label',
                { defaultMessage: 'Content syncs' }
              ),
              ...(errorOnContentSync ? { iconSide: 'right', iconType: 'warning' } : {}),
            },

            {
              id: 'access_control',
              label: i18n.translate(
                'xpack.enterpriseSearch.content.syncJobs.lastSync.tableSelector.accessControl.label',
                { defaultMessage: 'Access control syncs' }
              ),
              ...(errorOnAccessSync ? { iconSide: 'right', iconType: 'warning' } : {}),
            },
          ]}
        />
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
