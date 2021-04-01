/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { Alert } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';
import {
  transformAction,
  transformAlert,
  transformExecutionStatus,
} from './common_transformations';

export async function loadAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<Alert> {
  const res = await http.get(`${BASE_ALERTING_API_PATH}/rule/${alertId}`);
  const actions = res.actions.map((action: any) => transformAction(action));
  const executionStatus = transformExecutionStatus(res.execution_status as any);
  return transformAlert({ ...res, actions, execution_status: executionStatus });
}
