/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../constants';
import { SwimlaneFieldMappingConfig } from './types';

export async function getApplication({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}): Promise<{ fields: SwimlaneFieldMappingConfig[] }> {
  return await http.post(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'getApplication', subActionParams: {} },
      }),
      signal,
    }
  );
}
