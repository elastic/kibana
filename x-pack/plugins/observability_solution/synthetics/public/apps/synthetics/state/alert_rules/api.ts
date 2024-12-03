/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../../../common/constants/synthetics_alerts';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { DEFAULT_ALERT_RESPONSE } from '../../../../../common/types/default_alerts';
import { apiService } from '../../../../utils/api_service';

interface Payload {
  enableTls: boolean;
  enableMonitorStatus: boolean;
}

export async function getDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export async function enableDefaultAlertingAPI(payload?: Payload): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING, payload);
}

export async function updateDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export function generateFilter(types: string[]) {
  if (types.length === 0) {
    return '';
  }

  return types.reduce((acc, type) => {
    if (acc === '') {
      return `alert.attributes.alertTypeId: "${type}"`;
    }
    return `${acc} OR alert.attributes.alertTypeId: "${type}"`;
  }, '');
}
export async function getActiveRulesAPI(): Promise<any> {
  return apiService.post('/internal/alerting/rules/_find', {
    filter: generateFilter([SYNTHETICS_TLS_RULE, SYNTHETICS_STATUS_RULE]),
    per_page: 10000,
  });
}
