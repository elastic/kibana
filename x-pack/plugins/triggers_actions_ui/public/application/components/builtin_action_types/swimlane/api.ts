/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../../../../actions/common';

export async function getApplication({
  http,
  signal,
  connectorId,
  id,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  id: string;
}): Promise<Record<string, any>> {
  return await http.post(`${BASE_ACTION_API_PATH}/action/`, {
    body: JSON.stringify({
      params: { subAction: 'application', subActionParams: { id } },
    }),
    signal,
  });
}
