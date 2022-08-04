/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_UI_ID } from '../../../../common/constants';

export const FETCH_ALERTS = {
  HISTOGRAM: `${APP_UI_ID} fetchAlerts histogram`,
} as const;

export const SEARCH_STRATEGY = {
  NETWORK_FLOW: `${APP_UI_ID} searchStrategy network flow`,
  NETWORK_IP_FLOW: `${APP_UI_ID} searchStrategy network IP flow`,
} as const;

export type SearchStrategyMonitoringEntry = keyof typeof SEARCH_STRATEGY;
export type SearchStrategyMonitoringKey = typeof SEARCH_STRATEGY[SearchStrategyMonitoringEntry];
