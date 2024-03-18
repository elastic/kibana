/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { type } from 'io-ts';
import { useActions, useValues } from 'kea';

import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SyncJobsTable } from '@kbn/search-connectors';

import { KibanaLogic } from '../../../../shared/kibana';

import { IndexViewLogic } from '../index_view_logic';

import { SyncJobsViewLogic } from './sync_jobs_view_logic';

export const SyncJobs: React.FC = () => {
  const { hasDocumentLevelSecurityFeature } = useValues(IndexViewLogic);
  const { productFeatures } = useValues(KibanaLogic);
  const [selectedSyncJobCategory, setSelectedSyncJobCategory] = useState<string>('content');
  const shouldShowAccessSyncs =
    productFeatures.hasDocumentLevelSecurityEnabled && hasDocumentLevelSecurityFeature;
  const { connectorId, syncJobsPagination: pagination, syncJobs } = useValues(SyncJobsViewLogic);
  const { fetchSyncJobs } = useActions(SyncJobsViewLogic);

  useEffect(() => {
    if (connectorId) {
      fetchSyncJobs({
        connectorId,
        from: pagination.pageIndex * (pagination.pageSize || 0),
        size: pagination.pageSize ?? 10,
        type: selectedSyncJobCategory as 'access_control' | 'content',
      });
    }
  }, [connectorId, selectedSyncJobCategory, type]);

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
            setSelectedSyncJobCategory(optionId);
          }}
          options={[
            {
              id: 'content',
              label: i18n.translate(
                'xpack.enterpriseSearch.content.syncJobs.lastSync.tableSelector.content.label',
                { defaultMessage: 'Content syncs' }
              ),
            },

            {
              id: 'access_control',
              label: i18n.translate(
                'xpack.enterpriseSearch.content.syncJobs.lastSync.tableSelector.accessControl.label',
                { defaultMessage: 'Access control syncs' }
              ),
            },
          ]}
        />
      )}
      {selectedSyncJobCategory === 'content' ? (
        <SyncJobsTable
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
        />
      ) : (
        <SyncJobsTable
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
          pagination={pagination}
          syncJobs={syncJobs}
          type="access_control"
        />
      )}
    </>
  );
};
