/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiToolTip } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { getAlertsBadgeDescriptor } from '../badge/alerts_badge';
import { renderAlertsHeaderBadge } from '../badge/alerts_header_badge';
import { TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { useTransactionDetailFlyoutAlertsBadge } from './hooks/use_transaction_detail_flyout_alerts_badge';
import { useTransactionDetailFlyoutLinks } from './hooks/use_transaction_detail_flyout_links';
import { useTransactionDetailFlyoutSummaryItems } from './summary';
import { useTransactionDetailFlyoutContext } from './transaction_detail_flyout_context';

const { MetaBlock } = FlyoutTemplate.Header;

const TITLE_LINK_TOOLTIP = i18n.translate('xpack.apm.transactionDetailFlyout.titleLinkTooltip', {
  defaultMessage: 'Open transaction details',
});

export interface TransactionDetailFlyoutHeaderParts {
  titleNode: ReactNode;
  titleText: string;
  metaBlocks: ReactElement[];
  badges: ReactElement[];
}

/**
 * Resolves the transaction detail flyout header content for `FlyoutTemplate.Header`: the title node
 * and its plain-text form, the environment / transaction type / date range meta blocks, and the
 * alerts badge. The template owns the heading element and only renders parts that are direct
 * children of the header, so the parts are returned as element arrays.
 */
export function useTransactionDetailFlyoutHeader(): TransactionDetailFlyoutHeaderParts {
  const {
    filters: { serviceName, transactionName },
  } = useTransactionDetailFlyoutContext();
  const {
    apm: { transactionDetailsHref },
  } = useTransactionDetailFlyoutLinks();
  const {
    show: showAlertsBadge,
    count: alertsCount,
    href: alertsHref,
  } = useTransactionDetailFlyoutAlertsBadge();
  const summaryItems = useTransactionDetailFlyoutSummaryItems();

  const titleContent = transactionDetailsHref ? (
    <EuiToolTip content={TITLE_LINK_TOOLTIP} position="bottom">
      <EuiLink
        href={transactionDetailsHref}
        data-test-subj="transactionDetailFlyoutTitleLink"
        {...getEbtProps({
          action: EBT_CLICK_ACTIONS.VIEW_SPAN,
          element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.TITLE,
        })}
      >
        {transactionName}
      </EuiLink>
    </EuiToolTip>
  ) : (
    transactionName
  );

  const titleNode = <span data-test-subj="transactionDetailFlyoutTitle">{titleContent}</span>;

  const metaBlocks = summaryItems.map(({ id, title, value }) => (
    <MetaBlock
      key={id}
      id={id}
      title={title}
      data-test-subj={`transactionDetailFlyoutSummary-${id}`}
    >
      {value}
    </MetaBlock>
  ));

  const badges: ReactElement[] = [];

  if (showAlertsBadge) {
    const descriptor = getAlertsBadgeDescriptor({
      count: alertsCount,
      serviceName,
      transactionName,
      href: alertsHref,
      'data-test-subj': 'transactionDetailFlyoutAlertsBadge',
      ebt: {
        action: EBT_CLICK_ACTIONS.VIEW_ALERTS,
        element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.ALERTS_BADGE,
      },
    });

    badges.push(renderAlertsHeaderBadge(descriptor));
  }

  return { titleNode, titleText: transactionName, metaBlocks, badges };
}
