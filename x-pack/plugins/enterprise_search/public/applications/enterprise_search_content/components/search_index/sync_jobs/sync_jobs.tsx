/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../shared/kibana';

import { IndexViewLogic } from '../index_view_logic';

import { SyncJobsHistoryTable } from './sync_jobs_history_table';

export const SyncJobs: React.FC = () => {
  const { hasDocumentLevelSecurityFeature } = useValues(IndexViewLogic);
  const { productFeatures } = useValues(KibanaLogic);
  const [selectedSyncJobCategory, setSelectedSyncJobCategory] = useState<string>('content');
  const shouldShowAccessSyncs =
    productFeatures.hasDocumentLevelSecurityEnabled && hasDocumentLevelSecurityFeature;

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
        <SyncJobsHistoryTable type="content" />
      ) : (
        <SyncJobsHistoryTable type="access_control" />
      )}
    </>
  );
};
