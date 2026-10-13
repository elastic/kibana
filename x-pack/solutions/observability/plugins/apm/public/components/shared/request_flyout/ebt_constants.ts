/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EBT element identifiers for the request flyout.
 * Mirror SERVICE_FLYOUT_EBT_ELEMENTS in service_flyout/ebt_constants.ts.
 *
 * NOTE (PoC concern #10): a full EBT event schema registration for
 * reportRequestFlyoutViewed is deferred. Only the element constants are wired here.
 */
export const REQUEST_FLYOUT_EBT_ELEMENTS = {
  ACTIONS_MENU: 'requestFlyoutActionsMenu',
  QUERY_CONTROLS: 'requestFlyoutQueryControls',
  CHART_CONTROLS: 'requestFlyoutChartControls',
} as const;
