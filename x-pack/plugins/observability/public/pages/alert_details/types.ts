/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopAlert } from '../alerts/containers/alerts_page/types';

export interface AlertSummaryProps {
  alert: TopAlert | null;
}

export interface AlertDetailsPathParams {
  alertId: string;
}

export const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';
