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

import { IngestionStatus } from '@kbn/search-connectors';

import { Status } from '../../../../../../../common/types/api';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { CancelSyncsApiLogic } from '../../../../api/connector/cancel_syncs_api_logic';
import { ConnectorViewLogic } from '../../../connector_detail/connector_view_logic';
import { CancelSyncsLogic } from '../../connector/cancel_syncs_logic';
import { IndexViewLogic } from '../../index_view_logic';

export const SyncsContextMenu: React.FC = () => {
  const { config, productFeatures } = useValues(KibanaLogic);
  const { ingestionMethod, ingestionStatus, isCanceling, isSyncing, isWaitingForSync } =
    useValues(IndexViewLogic);
  const { connector, hasDocumentLevelSecurityFeature, hasIncrementalSyncFeature } =
    useValues(ConnectorViewLogic);
  const { cancelSyncs } = useActions(CancelSyncsLogic);
  const { status } = useValues(CancelSyncsApiLogic);
  const { startSync, startIncrementalSync, startAccessControlSync } = useActions(IndexViewLogic);
  const { errorConnectingMessage } = useValues(HttpLogic);

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

  const isEnterpriseSearchNotAvailable = Boolean(
    config.host && config.canDeployEntSearch && errorConnectingMessage
  );
  const isSyncsDisabled =
    (connector?.is_native && isEnterpriseSearchNotAvailable) ||
    ingestionStatus === IngestionStatus.INCOMPLETE ||
    !connector?.index_name;

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
                disabled: isSyncsDisabled,
                icon: 'play',
                name: i18n.translate('xpack.enterpriseSearch.index.header.more.fullSync', {
                  defaultMessage: 'Full Content',
                }),
                onClick: () => {
                  closePopover();
                  startSync();
                },
              },
            ]),
        ...(shouldShowIncrementalSync
          ? [
              {
                // @ts-ignore - data-* attributes are applied but doesn't exist on types
                'data-telemetry-id':
                  'entSearchContent-${ingestionMethod}-header-sync-more-incrementalSync',
                'data-test-subj':
                  'entSearchContent-${ingestionMethod}-header-sync-more-incrementalSync',
                disabled: isSyncsDisabled,
                icon: 'play',
                name: i18n.translate('xpack.enterpriseSearch.index.header.more.incrementalSync', {
                  defaultMessage: 'Incremental Content',
                }),
                onClick: () => {
                  closePopover();
                  startIncrementalSync();
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
                disabled: Boolean(
                  isSyncsDisabled || !connector?.configuration.use_document_level_security?.value
                ),
                icon: 'play',
                name: i18n.translate('xpack.enterpriseSearch.index.header.more.accessControlSync', {
                  defaultMessage: 'Access Control',
                }),
                onClick: () => {
                  closePopover();
                  startAccessControlSync();
                },
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
