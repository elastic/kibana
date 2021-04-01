/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { Alert, AlertUpdates } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';

export async function createAlert({
  http,
  alert,
}: {
  http: HttpSetup;
  alert: Omit<
    AlertUpdates,
    'createdBy' | 'updatedBy' | 'muteAll' | 'mutedInstanceIds' | 'executionStatus'
  >;
}): Promise<Alert> {
  return await http.post(`${BASE_ALERTING_API_PATH}/rule`, {
    body: JSON.stringify(alert),
  });
}
