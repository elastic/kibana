/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest } from '@kbn/core-http-server';
import { RequestBody } from './langchain/types';

interface Props {
  actions: ActionsPluginStart;
  connectorId: string;
  request: KibanaRequest<unknown, unknown, RequestBody>;
}
interface StaticResponse {
  connector_id: string;
  data: string;
  status: string;
}

export const executeAction = async ({
  actions,
  request,
  connectorId,
}: Props): Promise<StaticResponse> => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const actionResult = await actionsClient.execute({
    actionId: connectorId,
    params: request.body.params,
  });
  const content = get('data', actionResult) as unknown as { message: string };
  if (typeof content.message === 'string') {
    return {
      connector_id: connectorId,
      data: content.message, // the response from the actions framework
      status: 'ok',
    };
  }
  throw new Error('Unexpected action result');
};
