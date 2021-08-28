/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '../../../../../../../src/core/public/http/types';
import { BASE_ACTION_API_PATH } from '../../../../../actions/common';
import type {
  AsApiContract,
  RewriteRequestCase,
} from '../../../../../actions/common/rewrite_request_case';
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
  referenced_by_count: referencedByCount,
  is_missing_secrets: isMissingSecrets,
  ...res
}) => ({
  actionTypeId,
  isPreconfigured,
  referencedByCount,
  isMissingSecrets,
  ...res,
});

export async function loadAllActions({ http }: { http: HttpSetup }): Promise<ActionConnector[]> {
  const res = await http.get(`${BASE_ACTION_API_PATH}/connectors`);
  return rewriteResponseRes(res);
}
