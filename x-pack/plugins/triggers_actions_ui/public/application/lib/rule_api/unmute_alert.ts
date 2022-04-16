/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { BASE_ALERTING_API_PATH } from '../../constants';

export async function unmuteAlertInstance({
  id,
  instanceId,
  http,
}: {
  id: string;
  instanceId: string;
  http: HttpSetup;
}): Promise<void> {
  await http.post(
    `${BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(id)}/alert/${encodeURIComponent(
      instanceId
    )}/_unmute`
  );
}
