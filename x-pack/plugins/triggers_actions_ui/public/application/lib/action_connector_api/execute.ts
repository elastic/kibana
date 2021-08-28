/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import { BASE_ACTION_API_PATH } from '../../../../../actions/common';
import type { RewriteRequestCase } from '../../../../../actions/common/rewrite_request_case';
import type { ActionTypeExecutorResult } from '../../../../../actions/common/types';

const rewriteBodyRes: RewriteRequestCase<ActionTypeExecutorResult<unknown>> = ({
  connector_id: actionId,
  service_message: serviceMessage,
  ...res
}) => ({
  ...res,
  actionId,
  serviceMessage,
});

export async function executeAction({
  id,
  params,
  http,
}: {
  id: string;
  http: HttpSetup;
  params: Record<string, unknown>;
}): Promise<ActionTypeExecutorResult<unknown>> {
  const res = await http.post(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}/_execute`,
    {
      body: JSON.stringify({ params }),
    }
  );
  return rewriteBodyRes(res);
}
