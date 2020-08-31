/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { BASE_ALERT_API_PATH } from '../../../../alerts/common';
export { BASE_ACTION_API_PATH } from '../../../../actions/common';

export type Section = 'connectors' | 'alerts';

export const routeToHome = `/`;
export const routeToConnectors = `/connectors`;
export const routeToAlerts = `/alerts`;
export const routeToAlertDetails = `/alert/:alertId`;

export { TIME_UNITS } from './time_units';
export enum SORT_ORDERS {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export const DEFAULT_SEARCH_PAGE_SIZE: number = 10;
