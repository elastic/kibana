/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../constants';
import { ConnectorExecutorResult, rewriteResponseToCamelCase } from '../rewrite_response_body';

export async function getIncidentTypes({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}): Promise<Record<string, any>> {
  const res = await http.post<ConnectorExecutorResult<unknown>>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'incidentTypes', subActionParams: {} },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}

export async function getSeverity({
  http,
  signal,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
}): Promise<Record<string, any>> {
  const res = await http.post<ConnectorExecutorResult<unknown>>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'severity', subActionParams: {} },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}
