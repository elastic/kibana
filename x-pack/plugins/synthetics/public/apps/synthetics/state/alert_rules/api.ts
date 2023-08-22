/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service';

export async function getDefaultAlertingAPI(): Promise<{ statusRule: Rule; tlsRule: Rule }> {
  return apiService.get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export async function enableDefaultAlertingAPI(): Promise<{ statusRule: Rule; tlsRule: Rule }> {
  return apiService.post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}

export async function updateDefaultAlertingAPI(): Promise<Rule> {
  return apiService.put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING);
}
