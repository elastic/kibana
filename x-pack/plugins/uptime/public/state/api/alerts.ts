/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';
import { MonitorIdParam } from '../actions/types';
import { Alert } from '../../../../triggers_actions_ui/public';

export const fetchAlertRecords = async ({ monitorId }: MonitorIdParam): Promise<Alert> => {
  const data = {
    page: 1,
    per_page: 500,
    filter: 'alert.attributes.alertTypeId:(xpack.uptime.alerts.durationAnomaly)',
    default_search_operator: 'AND',
    sort_field: 'name.keyword',
    sort_order: 'asc',
  };
  const alerts = await apiService.get(API_URLS.ALERTS_FIND, data);
  return alerts.data.find((alert: Alert) => alert.params.monitorId === monitorId);
};

export const disableAnomalyAlert = async ({ alertId }: { alertId: string }) => {
  return await apiService.delete(API_URLS.ALERT + alertId);
};
