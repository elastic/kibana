/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest } from '@kbn/core-http-server';
import { PassThrough, Readable } from 'stream';
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
}: Props): Promise<StaticResponse | Readable> => {
  const actionsClient = await actions.getActionsClientWithRequest(request);

  console.log('one');
  const actionResult = await actionsClient.execute({
    actionId: connectorId,
    params: {
      ...request.body.params,
      subActionParams:
        // TODO: Remove in part 2 of streaming work for security solution
        // tracked here: https://github.com/elastic/security-team/issues/7363
        request.body.params.subAction === 'invokeAI'
          ? request.body.params.subActionParams
          : { body: JSON.stringify(request.body.params.subActionParams), stream: true },
    },
  });
  console.log('two', actionResult);
  const content = get('data.message', actionResult);
  if (typeof content === 'string') {
    return {
      connector_id: connectorId,
      data: content, // the response from the actions framework
      status: 'ok',
    };
  }
  const readable = get('data', actionResult);

  console.log('typeof', typeof readable);
  console.log('three', readable);
  return (readable as Readable).pipe(new PassThrough());
};
