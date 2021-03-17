/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from 'kibana/public';
import { RewriteRequestCase, RewriteResponseCase } from '../../../../../actions/common';
import { BASE_ACTION_API_PATH } from '../../constants';
import type {
  ActionConnector,
  ActionConnectorProps,
  ActionConnectorWithoutId,
} from '../../../types';

const rewriteBodyRequest: RewriteResponseCase<
  Omit<ActionConnectorWithoutId, 'referencedByCount'>
> = ({ actionTypeId, isPreconfigured, ...res }) => ({
  ...res,
  connector_type_id: actionTypeId,
  is_preconfigured: isPreconfigured,
});

const rewriteBodyRes: RewriteRequestCase<
  ActionConnectorProps<Record<string, unknown>, Record<string, unknown>>
> = ({ connector_type_id: actionTypeId, is_preconfigured: isPreconfigured, ...res }) => ({
  ...res,
  actionTypeId,
  isPreconfigured,
});

export async function createActionConnector({
  http,
  connector,
}: {
  http: HttpSetup;
  connector: Omit<ActionConnectorWithoutId, 'referencedByCount'>;
}): Promise<ActionConnector> {
  const res = await http.post(`${BASE_ACTION_API_PATH}/connector`, {
    body: JSON.stringify(rewriteBodyRequest(connector)),
  });
  return rewriteBodyRes(res);
}
