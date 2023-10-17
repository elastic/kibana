/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult, RewriteResponseCase } from '@kbn/actions-plugin/common';
import { HttpSetup } from '@kbn/core-http-browser';
import { BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';

export type ConnectorExecutorResult<T> = ReturnType<
  RewriteResponseCase<ActionTypeExecutorResult<T>>
>;

const rewriteResponseToCamelCase = <T>({
  connector_id: actionId,
  service_message: serviceMessage,
  ...data
}: ConnectorExecutorResult<T>): ActionTypeExecutorResult<T> => ({
  ...data,
  actionId,
  ...(serviceMessage && { serviceMessage }),
});

export const getDashboardId = (spaceId: string): string => `generative-ai-token-usage-${spaceId}`;

export async function getDashboard({
  http,
  signal,
  dashboardId,
  connectorId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  dashboardId: string;
}): Promise<ActionTypeExecutorResult<{ available: boolean }>> {
  const res = await http.post<ConnectorExecutorResult<{ available: boolean }>>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'getDashboard', subActionParams: { dashboardId } },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}
