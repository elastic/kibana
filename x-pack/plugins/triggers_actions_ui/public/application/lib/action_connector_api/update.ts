/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import { BASE_ACTION_API_PATH } from '../../../../../actions/common';
import type { RewriteRequestCase } from '../../../../../actions/common/rewrite_request_case';
import type {
  ActionConnector,
  ActionConnectorProps,
  ActionConnectorWithoutId,
} from '../../../types';

const rewriteBodyRes: RewriteRequestCase<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>
> = ({
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_missing_secrets: isMissingSecrets,
  ...res
}) => ({
  ...res,
  actionTypeId,
  isPreconfigured,
  isMissingSecrets,
});

export async function updateActionConnector({
  http,
  connector,
  id,
}: {
  http: HttpSetup;
  connector: Pick<ActionConnectorWithoutId, 'name' | 'config' | 'secrets'>;
  id: string;
}): Promise<ActionConnector> {
  const res = await http.put(`${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}`, {
    body: JSON.stringify({
      name: connector.name,
      config: connector.config,
      secrets: connector.secrets,
    }),
  });

  return rewriteBodyRes(res);
}
