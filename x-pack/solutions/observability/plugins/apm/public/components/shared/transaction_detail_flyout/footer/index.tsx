/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { getFlyoutFooterMenuItem } from '../../flyout_footer_menu/get_flyout_footer_menu_item';
import { TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useTransactionDetailFlyoutLinks } from '../hooks/use_transaction_detail_flyout_links';

const DATA_TEST_SUBJ_PREFIX = 'transactionDetailFlyoutActionsMenu';

export interface TransactionDetailFlyoutFooterMenu {
  panels: FlyoutFooterMenuPanel[];
  isLoading: boolean;
  hasActions: boolean;
}

/**
 * Resolves the transaction detail flyout footer "Actions" menu as `Footer.PrimaryActionMenu`
 * panels. Items use the `transactionDetailFlyoutActionsMenuItem-*` test subjects.
 */
export function useTransactionDetailFlyoutFooterMenu(): TransactionDetailFlyoutFooterMenu {
  const {
    loading,
    apm: { transactionDetailsHref },
    discover: { href: discoverHref, openInDiscoverTab },
  } = useTransactionDetailFlyoutLinks();

  const panels = useMemo<FlyoutFooterMenuPanel[]>(() => {
    const items: FlyoutFooterMenuItem[] = [];

    if (discoverHref || openInDiscoverTab) {
      items.push(
        getFlyoutFooterMenuItem(
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
          DATA_TEST_SUBJ_PREFIX
        )
      );
    }

    if (transactionDetailsHref) {
      items.push(
        getFlyoutFooterMenuItem(
          {
            id: 'openTransactionDetails',
            name: i18n.translate('xpack.apm.transactionDetailFlyout.openTransactionDetailsAction', {
              defaultMessage: 'Open transaction details',
            }),
            href: transactionDetailsHref,
            ebt: {
              action: EBT_CLICK_ACTIONS.VIEW_SPAN,
              element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
              detail: 'transactionDetails',
            },
          },
          DATA_TEST_SUBJ_PREFIX
        )
      );
    }

    return [{ id: 0, items }];
  }, [discoverHref, openInDiscoverTab, transactionDetailsHref]);

  const hasActions = panels[0].items.length > 0;

  // Indices loading only affects Discover; keep the menu usable when other actions
  // (e.g. transaction details via locator) are already available.
  return { panels, isLoading: loading && !hasActions, hasActions };
}
