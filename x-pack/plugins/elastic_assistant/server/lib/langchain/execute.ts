/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest } from '@kbn/core-http-server';
import { RequestBody } from './types';

interface Props {
  actions: ActionsPluginStart;
  connectorId: string;
  request: KibanaRequest<unknown, unknown, RequestBody>;
}

export const executeAction = async ({ actions, request, connectorId }: Props) => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const actionResult = await actionsClient.execute({
    actionId: connectorId,
    params: request.body.params,
  });
  const content = get('data', actionResult);
  // if (typeof content !== 'string') {
  //   throw new Error(`content should be a string, but it had an unexpected type: ${typeof content}`);
  // }
  return {
    connector_id: connectorId,
    data: content, // the response from the actions framework
    status: 'ok',
  };
};
