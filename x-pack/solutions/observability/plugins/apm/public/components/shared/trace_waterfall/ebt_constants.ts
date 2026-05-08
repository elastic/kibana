/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TRACE_WATERFALL_EBT_CLICK_ACTIONS = {
  VIEW_FULL_TRACE: 'viewFullTrace',
  SCROLL_TO_ORIGIN: 'scrollToOrigin',
} as const;

export const TRACE_WATERFALL_EBT_ELEMENTS = {
  WATERFALL_ROW: 'waterfallRow',
  WATERFALL_ERROR_BADGE: 'waterfallErrorBadge',
  WATERFALL_SERVICE_BADGE: 'waterfallServiceBadge',
  FLYOUT_WATERFALL_ROW: 'flyoutWaterfallRow',
  FLYOUT_WATERFALL_ERROR_BADGE: 'flyoutWaterfallErrorBadge',
  FLYOUT_WATERFALL_SERVICE_BADGE: 'flyoutWaterfallServiceBadge',
  SUMMARY_VIEW_FULL_TRACE: 'waterfallSummaryViewFullTrace',
  FLYOUT_OPEN_IN_DISCOVER: 'flyoutWaterfallOpenInDiscover',
  FLYOUT_OPEN_IN_APM: 'flyoutWaterfallOpenInApm',
  FLYOUT_SCROLL_TO_ORIGIN: 'flyoutWaterfallScrollToOriginButton',
} as const;
