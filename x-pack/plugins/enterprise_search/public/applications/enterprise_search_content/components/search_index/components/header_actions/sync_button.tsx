/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IngestionStatus } from '../../../../types';
import { IndexViewLogic } from '../../index_view_logic';

export const SyncButton: React.FC = () => {
  const { ingestionMethod, ingestionStatus, isSyncing, isWaitingForSync } =
    useValues(IndexViewLogic);
  const { startSync } = useActions(IndexViewLogic);

  const getSyncButtonText = () => {
    if (isWaitingForSync) {
      return i18n.translate(
        'xpack.enterpriseSearch.content.index.syncButton.waitingForSync.label',
        {
          defaultMessage: 'Waiting for sync',
        }
      );
    }
    if (isSyncing && ingestionStatus !== IngestionStatus.ERROR) {
      return i18n.translate('xpack.enterpriseSearch.content.index.syncButton.syncing.label', {
        defaultMessage: 'Syncing',
      });
    }
    return i18n.translate('xpack.enterpriseSearch.content.index.syncButton.label', {
      defaultMessage: 'Sync',
    });
  };
  return (
    <EuiButton
      data-telemetry-id={`entSearchContent-${ingestionMethod}-header-syncNow-startSync`}
      onClick={startSync}
      fill
      disabled={ingestionStatus === IngestionStatus.INCOMPLETE}
      isLoading={
        // If there's an error, the ingestion status may not be accurate and we may need to be able to trigger a sync
        (isSyncing && !(ingestionStatus === IngestionStatus.ERROR)) || isWaitingForSync
      }
    >
      {getSyncButtonText()}
    </EuiButton>
  );
};
