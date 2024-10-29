/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { DEFAULT_ALERT_RESPONSE } from '../../../../../common/types/default_alerts';
import { apiService } from '../../../../utils/api_service';

export async function getDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export async function enableDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export async function updateDefaultAlertingAPI(): Promise<DEFAULT_ALERT_RESPONSE> {
  return apiService.put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}
