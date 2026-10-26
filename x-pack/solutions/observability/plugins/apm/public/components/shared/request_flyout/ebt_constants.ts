/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * EBT element identifiers for the request flyout.
 * Mirror SERVICE_FLYOUT_EBT_ELEMENTS in service_flyout/ebt_constants.ts.
 */
export const REQUEST_FLYOUT_EBT_ELEMENTS = {
  ACTIONS_MENU: 'requestFlyoutActionsMenu',
  ROW_ACTIONS_MENU: 'requestFlyoutRowActionsMenu',
  LATENCY_AGGREGATION: 'requestFlyoutLatencyAggregation',
  TRANSACTION_NAME: 'requestFlyoutTransactionName',
  OPERATION_NAME: 'requestFlyoutOperationName',
  RESOURCE_NAME: 'requestFlyoutResourceName',
  TOP_ERROR: 'requestFlyoutTopError',
  APM_ERROR_GROUP_NAME: 'requestFlyoutApmErrorGroupName',
  LOG_ERROR_NAME: 'requestFlyoutLogErrorName',
  ERROR_TABS: 'requestFlyoutErrorTabs',
  DETAIL_LINK: 'requestFlyoutDetailLink',
  NO_METRICS_MESSAGE: 'requestFlyoutNoMetricsMessage',
} as const;

export const REQUEST_FLYOUT_EBT_ACTIONS = {
  VIEW_CHILD: 'viewRequestFlyoutChild',
  VIEW_ERROR_TAB: 'viewRequestFlyoutErrorTab',
  OPEN_DOCUMENTATION: 'openRequestFlyoutDocumentation',
} as const;

export const REQUEST_FLYOUT_EBT_DETAILS = {
  OPEN: 'open',
  CLOSE: 'close',
} as const;
