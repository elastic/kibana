/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { pick } from 'lodash';
import { BASE_ALERTING_API_PATH } from '../../constants';
import { Alert, AlertUpdates } from '../../../types';

export async function updateAlert({
  http,
  alert,
  id,
}: {
  http: HttpSetup;
  alert: Pick<
    AlertUpdates,
    'throttle' | 'name' | 'tags' | 'schedule' | 'params' | 'actions' | 'notifyWhen'
  >;
  id: string;
}): Promise<Alert> {
  return await http.put(`${BASE_ALERTING_API_PATH}/rule/${id}`, {
    body: JSON.stringify(
      pick(alert, ['throttle', 'name', 'tags', 'schedule', 'params', 'actions', 'notifyWhen'])
    ),
  });
}
