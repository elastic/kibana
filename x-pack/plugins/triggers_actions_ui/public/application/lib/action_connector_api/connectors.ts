/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import {
  AsApiContract,
  BASE_ACTION_API_PATH,
  INTERNAL_BASE_ACTION_API_PATH,
  RewriteRequestCase,
} from '@kbn/actions-plugin/common';
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
  is_system_action: isSystemAction,
  ...res
}) => ({
  actionTypeId,
  isPreconfigured,
  isDeprecated,
  referencedByCount,
  isMissingSecrets,
  isSystemAction,
  ...res,
});

export async function loadAllActions({
  http,
  includeSystemActions = false,
}: {
  http: HttpSetup;
  includeSystemActions?: boolean;
}): Promise<ActionConnector[]> {
  // Use the internal get_all_system route to load all action connectors and preconfigured system action connectors
  // This is necessary to load UI elements that require system action connectors, even if they're not selectable and
  // editable from the connector selection UI like a normal action connector.
  const path = includeSystemActions
    ? `${INTERNAL_BASE_ACTION_API_PATH}/connectors`
    : `${BASE_ACTION_API_PATH}/connectors`;

  const res = await http.get<Parameters<typeof rewriteResponseRes>[0]>(path);

  return rewriteResponseRes(res) as ActionConnector[];
}
