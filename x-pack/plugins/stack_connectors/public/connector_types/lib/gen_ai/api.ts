/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { ActionTypeExecutorResult, BASE_ACTION_API_PATH } from '@kbn/actions-plugin/common';
import { SUB_ACTION } from '../../../../common/openai/constants';
import { ConnectorExecutorResult, rewriteResponseToCamelCase } from '../rewrite_response_body';

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
        params: { subAction: SUB_ACTION.DASHBOARD, subActionParams: { dashboardId } },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}
