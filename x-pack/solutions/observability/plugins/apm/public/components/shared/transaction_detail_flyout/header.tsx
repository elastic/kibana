/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyoutHeader, EuiLink, EuiTitle } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import React from 'react';
import { TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { useTransactionDetailFlyoutLinks } from './hooks/use_transaction_detail_flyout_links';

interface TransactionDetailFlyoutHeaderProps {
  transactionName: string;
  titleId: string;
}

export function TransactionDetailFlyoutHeader({
  transactionName,
  titleId,
}: TransactionDetailFlyoutHeaderProps) {
  const {
    apm: { transactionDetailsHref },
  } = useTransactionDetailFlyoutLinks();

  return (
    <EuiFlyoutHeader hasBorder>
      <EuiTitle size="s">
        <h2 id={titleId} data-test-subj="transactionDetailFlyoutTitle">
          {transactionDetailsHref ? (
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
          ) : (
            transactionName
          )}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
}
