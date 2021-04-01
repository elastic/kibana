/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { AlertInstanceSummary } from '../../../types';

export async function loadAlertInstanceSummary({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<AlertInstanceSummary> {
  return await http.get(`${BASE_ALERTING_API_PATH}/rule/${alertId}/_instance_summary`);
}
