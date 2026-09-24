/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EBT element names for the nested transaction detail flyout stack.
 * Prefixed so analysts can aggregate with `click.element : transactionDetailFlyout*`.
 */
export const TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS = {
  TITLE: 'transactionDetailFlyoutTitle',
  FOOTER: 'transactionDetailFlyoutFooter',
  VIEW_FULL_TRACE: 'transactionDetailFlyoutViewFullTrace',
  WATERFALL_ROW: 'transactionDetailFlyoutWaterfallRow',
  WATERFALL_ERROR_BADGE: 'transactionDetailFlyoutWaterfallErrorBadge',
  WATERFALL_SERVICE_BADGE: 'transactionDetailFlyoutWaterfallServiceBadge',
} as const;
