/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiButtonGroup } from '@elastic/eui';

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
          legend={'Select sync job type to display.'}
          name={'Sync job type'}
          idSelected={selectedSyncJobCategory}
          onChange={(optionId) => {
            setSelectedSyncJobCategory(optionId);
          }}
          options={[
            {
              id: 'content',
              label: 'Content syncs',
            },

            {
              id: 'access_control',
              label: 'Access control syncs',
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
