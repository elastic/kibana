/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyoutFooter } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { ActionsContextMenu, type ActionGroups } from '../../actions_context_menu';
import { TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useTransactionDetailFlyoutLinks } from '../hooks/use_transaction_detail_flyout_links';

export function TransactionDetailFlyoutFooter() {
  const {
    loading,
    discover: { href: discoverHref, openInDiscoverTab },
  } = useTransactionDetailFlyoutLinks();

  const actionGroups = useMemo(() => {
    const groups: ActionGroups = [];

    if (discoverHref) {
      groups.push({
        id: 'discover',
        actions: [
          {
            id: 'openTracesInDiscover',
            name: openInDiscoverTab
              ? i18n.translate('xpack.apm.transactionDetailFlyout.openTracesInDiscoverTabAction', {
                  defaultMessage: 'Open traces in a Discover tab',
                })
              : i18n.translate('xpack.apm.transactionDetailFlyout.openTracesInDiscoverAction', {
                  defaultMessage: 'Open traces in Discover',
                }),
            href: discoverHref,
            onClick: openInDiscoverTab,
            ebt: {
              action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER,
              element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
              detail: 'traces',
            },
          },
        ],
      });
    }

    return groups;
  }, [discoverHref, openInDiscoverTab]);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ActionsContextMenu
            id="transaction-detail-flyout-actions-menu"
            dataTestSubjPrefix="transactionDetailFlyoutActionsMenu"
            actions={actionGroups}
            button={
              <EuiButton
                fill
                size="s"
                iconType="chevronSingleDown"
                iconSide="right"
                isLoading={loading}
                disabled={loading || actionGroups.length === 0}
                data-test-subj="transactionDetailFlyoutActionsButton"
                {...getEbtProps({
                  action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
                  element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
                })}
              >
                {i18n.translate('xpack.apm.transactionDetailFlyout.actionsButtonLabel', {
                  defaultMessage: 'Actions',
                })}
              </EuiButton>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
}
