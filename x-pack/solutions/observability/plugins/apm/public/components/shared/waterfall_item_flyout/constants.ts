/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * Width cap for the waterfall transaction and span flyouts (`size="fill"`). EUI resolves the width
 * to the smaller of this and 90% of the viewport, which tracks the stepped 80/70/60% widths these
 * flyouts used before within ~85px.
 */
export const WATERFALL_FLYOUT_MAX_WIDTH = 'calc(50vw + 300px)';

export const TIMESTAMP_LABEL = i18n.translate('xpack.apm.waterfallItemFlyout.timestampLabel', {
  defaultMessage: 'Timestamp',
});

export const DURATION_LABEL = i18n.translate('xpack.apm.waterfallItemFlyout.durationLabel', {
  defaultMessage: 'Duration',
});

export const REQUEST_LABEL = i18n.translate('xpack.apm.waterfallItemFlyout.requestLabel', {
  defaultMessage: 'Request',
});

export const NAME_LABEL = i18n.translate('xpack.apm.transactionDetails.spanFlyout.nameLabel', {
  defaultMessage: 'Name',
});

export const SERVICE_LABEL = i18n.translate('xpack.apm.transactionDetails.serviceLabel', {
  defaultMessage: 'Service',
});

export const TRANSACTION_LABEL = i18n.translate('xpack.apm.transactionDetails.transactionLabel', {
  defaultMessage: 'Transaction',
});
