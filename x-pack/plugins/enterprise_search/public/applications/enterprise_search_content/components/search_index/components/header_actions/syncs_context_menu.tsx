/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../../common/types/api';
import { CancelSyncsApiLogic } from '../../../../api/connector/cancel_syncs_api_logic';
import { IngestionStatus } from '../../../../types';
import { CancelSyncsLogic } from '../../connector/cancel_syncs_logic';
import { IndexViewLogic } from '../../index_view_logic';

export const SyncsContextMenu: React.FC = () => {
  const { ingestionMethod, ingestionStatus, isCanceling, isSyncing, isWaitingForSync } =
    useValues(IndexViewLogic);
  const { cancelSyncs } = useActions(CancelSyncsLogic);
  const { status } = useValues(CancelSyncsApiLogic);
  const { startSync } = useActions(IndexViewLogic);

  const [isPopoverOpen, setPopover] = useState(false);

  const togglePopover = () => setPopover(!isPopoverOpen);
  const closePopover = () => setPopover(false);

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

  const syncLoading = (isSyncing || isWaitingForSync) && ingestionStatus !== IngestionStatus.ERROR;

  return (
    <EuiPopover
      button={
        <EuiButton
          data-telemetry-id={`entSearchContent-${ingestionMethod}-header-sync-openSyncMenu`}
          iconType="arrowDown"
          iconSide="right"
          onClick={togglePopover}
          fill
        >
          <EuiFlexGroup alignItems="center" responsive={false} gutterSize="s">
            {syncLoading && (
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
            )}
            <EuiFlexItem>{getSyncButtonText()}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={[
          ...(syncLoading
            ? []
            : [
                <EuiContextMenuItem
                  data-telemetry-id={`entSearchContent-${ingestionMethod}-header-sync-startSync`}
                  disabled={ingestionStatus === IngestionStatus.INCOMPLETE}
                  key="Sync"
                  onClick={() => {
                    closePopover();
                    startSync();
                  }}
                  icon="play"
                >
                  {getSyncButtonText()}
                </EuiContextMenuItem>,
              ]),
          <EuiContextMenuItem
            data-telemetry-id={`entSearchContent-${ingestionMethod}-header-sync-cancelSync`}
            disabled={
              (isCanceling && ingestionStatus !== IngestionStatus.ERROR) ||
              status === Status.LOADING
            }
            key="Cancel sync"
            onClick={() => {
              closePopover();
              cancelSyncs();
            }}
            icon="trash"
          >
            {i18n.translate('xpack.enterpriseSearch.index.header.cancelSyncsTitle', {
              defaultMessage: 'Cancel Syncs',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
