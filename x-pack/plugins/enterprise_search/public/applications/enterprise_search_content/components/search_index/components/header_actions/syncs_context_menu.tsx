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
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiContextMenu,
  EuiContextMenuProps,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../../common/types/api';
import { KibanaLogic } from '../../../../../shared/kibana';
import { CancelSyncsApiLogic } from '../../../../api/connector/cancel_syncs_api_logic';
import { IngestionStatus } from '../../../../types';
import { CancelSyncsLogic } from '../../connector/cancel_syncs_logic';
import { IndexViewLogic } from '../../index_view_logic';

export const SyncsContextMenu: React.FC = () => {
  const { productFeatures } = useValues(KibanaLogic);
  const {
    hasDocumentLevelSecurityFeature,
    hasIncrementalSyncFeature,
    ingestionMethod,
    ingestionStatus,
    isCanceling,
    isSyncing,
    isWaitingForSync,
  } = useValues(IndexViewLogic);
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

  const shouldShowDocumentLevelSecurity =
    productFeatures.hasDocumentLevelSecurityEnabled && hasDocumentLevelSecurityFeature;
  const shouldShowIncrementalSync =
    productFeatures.hasIncrementalSyncEnabled && hasIncrementalSyncFeature;

  const shouldShowMoreSync =
    !syncLoading && (shouldShowDocumentLevelSecurity || shouldShowIncrementalSync);

  const panels: EuiContextMenuProps['panels'] = [
    {
      id: 0,
      items: [
        ...(syncLoading
          ? []
          : [
              {
                // @ts-ignore - data-* attributes are applied but doesn't exist on types
                'data-telemetry-id': `entSearchContent-${ingestionMethod}-header-sync-startSync`,
                'data-test-subj': `entSearchContent-${ingestionMethod}-header-sync-startSync`,
                disabled: ingestionStatus === IngestionStatus.INCOMPLETE,
                icon: 'play',
                name: getSyncButtonText(),
                onClick: () => {
                  closePopover();
                  startSync();
                },
              },
            ]),
        ...(shouldShowMoreSync
          ? [
              {
                // @ts-ignore - data-* attributes are applied but doesn't exist on types
                'data-telemetry-id': `entSearchContent-${ingestionMethod}-header-sync-moreSyncs`,
                icon: 'play',
                name: i18n.translate('xpack.enterpriseSearch.index.header.moreSyncsTitle', {
                  defaultMessage: 'More syncs',
                }),
                panel: 1,
              },
            ]
          : []),
        {
          // @ts-ignore - data-* attributes are applied but doesn't exist on types
          'data-telemetry-id': `entSearchContent-${ingestionMethod}-header-sync-cancelSync`,
          disabled:
            (isCanceling && ingestionStatus !== IngestionStatus.ERROR) || status === Status.LOADING,
          icon: <EuiIcon type="cross" size="m" color="danger" />,
          name: (
            <EuiText color="danger" size="s">
              <p>
                {i18n.translate('xpack.enterpriseSearch.index.header.cancelSyncsTitle', {
                  defaultMessage: 'Cancel Syncs',
                })}
              </p>
            </EuiText>
          ),
          onClick: () => {
            closePopover();
            cancelSyncs();
          },
        },
      ],
      title: 'Sync',
    },
    {
      id: 1,
      items: [
        {
          // @ts-ignore - data-* attributes are applied but doesn't exist on types
          'data-telemetry-id':
            'entSearchContent-${ingestionMethod}-header-sync-more-fullContentSync',
          'data-test-subj': 'entSearchContent-${ingestionMethod}-header-sync-more-fullContentSync',
          icon: 'play',
          name: i18n.translate('xpack.enterpriseSearch.index.header.more.fullContentSync', {
            defaultMessage: 'Full content',
          }),
          onClick: () => {
            closePopover();
            startSync();
          },
        },
        ...(shouldShowIncrementalSync
          ? [
              {
                // @ts-ignore - data-* attributes are applied but doesn't exist on types
                'data-telemetry-id':
                  'entSearchContent-${ingestionMethod}-header-sync-more-incrementalSync',
                'data-test-subj':
                  'entSearchContent-${ingestionMethod}-header-sync-more-incrementalSync',
                icon: 'play',
                name: i18n.translate('xpack.enterpriseSearch.index.header.more.incrementalSync', {
                  defaultMessage: 'Incremental content',
                }),
                onClick: () => {
                  closePopover();
                  startSync(); // TODO DO NOT MERGE / REPLACE WITH PROPER SYNC
                },
              },
            ]
          : []),
        ...(shouldShowDocumentLevelSecurity
          ? [
              {
                // @ts-ignore - data-* attributes are applied but doesn't exist on types
                'data-telemetry-id':
                  'entSearchContent-${ingestionMethod}-header-sync-more-accessControlSync',
                'data-test-subj':
                  'entSearchContent-${ingestionMethod}-header-sync-more-accessControlSync',
                icon: 'play',
                name: i18n.translate('xpack.enterpriseSearch.index.header.more.accessControlSync', {
                  defaultMessage: 'Access Control',
                }),
                onClick: () => {
                  closePopover();
                  startSync(); // TODO DO NOT MERGE / REPLACE WITH PROPER SYNC
                },
              },
            ]
          : []),
        {
          // @ts-ignore - data-* attributes are applied but doesn't exist on types
          'data-telemetry-id': 'entSearchContent-${ingestionMethod}-header-sync-more-allSync',
          'data-test-subj': 'entSearchContent-${ingestionMethod}-header-sync-more-allSync',
          icon: 'play',
          name: i18n.translate('xpack.enterpriseSearch.index.header.more.allSync', {
            defaultMessage: 'All',
          }),
          onClick: () => {
            closePopover();
            startSync(); // TODO DO NOT MERGE / REPLACE WITH PROPER SYNC
          },
        },
      ],
      title: i18n.translate('xpack.enterpriseSearch.index.header.syncMenuTitle', {
        defaultMessage: 'Sync',
      }),
    },
  ];

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
            <EuiFlexItem data-test-subj={`entSearchContent-${ingestionMethod}-header-sync-menu`}>
              {getSyncButtonText()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
