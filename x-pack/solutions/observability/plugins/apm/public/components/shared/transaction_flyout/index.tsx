/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import type { SpanLinksCount } from '../span_links';
import { TRANSACTION_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { useTransactionFlyoutFooterMenu } from './footer/use_transaction_flyout_footer_menu';
import { useDroppedSpansCallout } from './use_dropped_spans_callout';
import {
  TRANSACTION_DETAILS_LABEL,
  useTransactionFlyoutHeader,
} from './use_transaction_flyout_header';
import { useTransactionFlyoutTabs } from './use_transaction_flyout_tabs';

const INVESTIGATE_LABEL = i18n.translate('xpack.apm.transactionActionMenu.actionsButtonLabel', {
  defaultMessage: 'Investigate',
});

interface Props {
  transactionId: string;
  traceId: string;
  onClose: () => void;
  errorCount?: number;
  rootTransactionDuration?: number;
  spanLinksCount: SpanLinksCount;
  flyoutDetailTab?: string;
  start: string;
  end: string;
}

export function TransactionFlyout({
  transactionId,
  traceId,
  onClose,
  errorCount = 0,
  rootTransactionDuration,
  spanLinksCount,
  flyoutDetailTab,
  start,
  end,
}: Props) {
  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/{traceId}/transactions/{transactionId}', {
        params: { path: { traceId, transactionId }, query: { start, end } },
      });
    },
    [traceId, transactionId, start, end]
  );

  // The fetcher keeps the previous document while the next one loads; gate on the status so a
  // switch between waterfall items never shows the previous transaction.
  const isTransactionLoading = isPending(status);
  const transaction = isTransactionLoading ? undefined : data;

  const { metaBlocks, infoBlocks, badges } = useTransactionFlyoutHeader({
    transaction,
    errorCount,
    rootTransactionDuration,
  });
  const tabs = useTransactionFlyoutTabs({ transaction, spanLinksCount });
  const droppedSpansCallout = useDroppedSpansCallout(transaction);
  const { panels, isLoading, hasActions, customLinkFlyout } = useTransactionFlyoutFooterMenu({
    transaction,
    isTransactionLoading,
  });

  return (
    <>
      <FlyoutTemplate
        data-test-subj="transactionFlyout"
        onClose={onClose}
        ownFocus
        size="m"
        tabs={tabs.map(({ tab }) => tab)}
        defaultSelectedTabId={flyoutDetailTab}
        tabBarProps={{ 'data-test-subj': 'transactionFlyoutTabs' }}
      >
        <FlyoutTemplate.Header
          title={TRANSACTION_DETAILS_LABEL}
          data-test-subj="transactionFlyoutHeader"
        >
          {metaBlocks}
          {infoBlocks}
          {badges}
        </FlyoutTemplate.Header>
        <FlyoutTemplate.Body>
          {droppedSpansCallout}
          {isTransactionLoading ? <EuiSkeletonText isLoading /> : null}
          {tabs.map(({ tab, panel }) => (
            <FlyoutTemplate.Body.TabPanel key={tab.id} tabId={tab.id}>
              {panel}
            </FlyoutTemplate.Body.TabPanel>
          ))}
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={INVESTIGATE_LABEL}
            panels={panels}
            isLoading={isLoading}
            isDisabled={!hasActions}
            data-test-subj="transactionFlyoutActionsButton"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
              element: TRANSACTION_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            })}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
      {customLinkFlyout}
    </>
  );
}
