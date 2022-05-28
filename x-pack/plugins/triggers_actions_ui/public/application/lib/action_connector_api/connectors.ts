/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { AsApiContract, RewriteRequestCase } from '@kbn/actions-plugin/common';
import { BASE_ACTION_API_PATH } from '../../constants';
import type { ActionConnector, ActionConnectorProps } from '../../../types';

const rewriteResponseRes = (
  results: Array<
    AsApiContract<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>>
  >
): Array<ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>> => {
  return results.map((item) => transformConnector(item));
};

const transformConnector: RewriteRequestCase<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>
> = ({
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
  is_deprecated: isDeprecated,
  referenced_by_count: referencedByCount,
  is_missing_secrets: isMissingSecrets,
  ...res
}) => ({
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  referencedByCount,
  isMissingSecrets,
  ...res,
});

export async function loadAllActions({ http }: { http: HttpSetup }): Promise<ActionConnector[]> {
  const res = await http.get<Parameters<typeof rewriteResponseRes>[0]>(
    `${BASE_ACTION_API_PATH}/connectors`
  );
  return rewriteResponseRes(res);
}
