/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest, ResponseHeaders } from '@kbn/core-http-server';
import { streamFactory, StreamFactoryReturnType } from '@kbn/ml-response-stream/server';
import { Logger } from '@kbn/logging';
import { Stream } from 'openai/src/streaming';
import { ChatCompletionChunk } from 'openai/src/resources/chat/completions';
import { RequestBody } from './langchain/types';

export interface Props {
  actions: ActionsPluginStart;
  connectorId: string;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  logger: Logger;
}
export interface StaticReturnType {
  body: { connector_id: string; data: string; status: string };
  headers: ResponseHeaders;
}
export const executeAction = async ({
  actions,
  request,
  connectorId,
  logger,
}: Props): Promise<StaticReturnType | StreamFactoryReturnType['responseWithHeaders']> => {
  const actionsClient = await actions.getActionsClientWithRequest(request);

  const actionResult = await actionsClient.execute({
    actionId: connectorId,
    params: request.body.params,
  });

  if (actionResult.status === 'error') {
    throw new Error(
      `Action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
    );
  }
  const content = get('data.message', actionResult);
  if (typeof content === 'string') {
    return {
      body: {
        connector_id: connectorId,
        data: content, // non-streamed response from the actions framework
        status: 'ok',
      },
      headers: {
        'content-type': 'application/json',
      },
    };
  }
  const readable = get('data', actionResult) as Stream<ChatCompletionChunk>;

  const {
    end: streamEnd,
    push,
    responseWithHeaders,
  } = streamFactory<{ type: string; payload: string }>(request.headers, logger, false, false);

  async function readStream() {
    for await (const chunk of readable) {
      const delta = chunk?.choices[0]?.delta;
      if (delta?.content && delta.content.length > 0) {
        push({ type: 'content', payload: delta.content });
      }
    }
    streamEnd();
  }
  // Do not call this using `await` so it will run asynchronously while we return the stream in responseWithHeaders
  readStream();

  return responseWithHeaders;
};
