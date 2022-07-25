/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { RewriteRequestCase } from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';
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
  is_deprecated: isDeprecated,
  is_missing_secrets: isMissingSecrets,
  ...res
}) => ({
  ...res,
  actionTypeId,
  isPreconfigured,
  isDeprecated,
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
  const res = await http.put<Parameters<typeof rewriteBodyRes>[0]>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify({
        name: connector.name,
        config: connector.config,
        secrets: connector.secrets,
      }),
    }
  );

  return rewriteBodyRes(res);
}
