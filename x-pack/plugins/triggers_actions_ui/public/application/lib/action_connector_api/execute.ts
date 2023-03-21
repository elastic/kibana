/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { ActionTypeExecutorResult, AsApiContract } from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';

const rewriteBodyRes = <R>({
  connector_id: actionId,
  service_message: serviceMessage,
  ...res
}: AsApiContract<ActionTypeExecutorResult<R>>): ActionTypeExecutorResult<R> => ({
  ...res,
  actionId,
  serviceMessage,
});

export async function executeAction<R>({
  id,
  params,
  http,
  signal,
}: {
  id: string;
  http: HttpSetup;
  params: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<ActionTypeExecutorResult<R>> {
  const res = await http.post<AsApiContract<ActionTypeExecutorResult<R>>>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}/_execute`,
    {
      body: JSON.stringify({ params }),
      signal,
    }
  );
  return rewriteBodyRes<R>(res);
}
