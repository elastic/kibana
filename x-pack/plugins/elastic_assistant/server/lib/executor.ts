/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { KibanaRequest } from '@kbn/core-http-server';
import { Stream } from 'openai/src/streaming';
import { ChatCompletionChunk } from 'openai/src/resources/chat/completions';
import { streamFactory } from '@kbn/ml-response-stream/server';
import { Logger } from '@kbn/logging';
import { RequestBody } from './langchain/types';

export interface Props {
  actions: ActionsPluginStart;
  connectorId: string;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  logger: Logger;
}
interface StaticResponse {
  connector_id: string;
  data: string;
  status: string;
}

type StreamResponse = Stream<ChatCompletionChunk>;

export const executeAction = async ({
  actions,
  request,
  connectorId,
  logger,
}: Props): Promise<StaticResponse | StreamResponse> => {
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
      connector_id: connectorId,
      data: content, // the response from the actions framework
      status: 'ok',
    };
  }
  const readable = get('data', actionResult) as StreamResponse;
  console.log('readable', {
    readable,
    readableT: readable.iterator,
    readableTy: typeof readable.iterator,
  });

  const {
    end: streamEnd,
    push,
    responseWithHeaders,
  } = streamFactory<any>(request.headers, logger, false, false);

  if (typeof readable?.toReadableStream !== 'function') {
    throw new Error('Action result status is error: result is not streamable');
  }
  async function readStream() {
    for await (const chunk of readable) {
      const delta = chunk.choices[0].delta;
      if (delta.content && delta.content.length > 0) {
        console.log('SERVER CHUNK', delta.content);
        push(delta.content);
      }
    }
    console.log('stream end');
    streamEnd();
  }
  // Do not call this using `await` so it will run asynchronously while we return the stream in responseWithHeaders
  readStream();

  return responseWithHeaders;
};
