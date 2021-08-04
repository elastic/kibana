/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { ResolvedAlert } from '../../../types';
import { BASE_ALERTING_API_PATH } from '../../constants';

export async function resolveAlert({
  http,
  alertId,
}: {
  http: HttpSetup;
  alertId: string;
}): Promise<ResolvedAlert> {
  const result: ResolvedAlert = await http.get(
    `${BASE_ALERTING_API_PATH}/rule/resolve/${encodeURIComponent(alertId)}`
  );
  return result;
}
