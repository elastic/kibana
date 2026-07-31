/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SERVICE_MAP_EBT_ELEMENTS = {
  CONNECTION_POPOVER: 'serviceMapConnectionPopover',
  EXPLORE_LINK: 'exploreInServiceMapLink',
} as const;

/** `data-ebt-detail` values for Explore in Service map — which surface opened the full map. */
export const SERVICE_MAP_EBT_DETAILS = {
  SERVICE_OVERVIEW: 'serviceOverview',
  MOBILE_SERVICE_OVERVIEW: 'mobileServiceOverview',
  TRANSACTION_DETAILS: 'transactionDetails',
  ALERT_DETAILS: 'alertDetails',
} as const;
