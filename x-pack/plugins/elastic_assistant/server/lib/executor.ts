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
import { Readable, PassThrough } from 'stream';
import { RequestBody } from './langchain/types';

export interface Props {
  actions: ActionsPluginStart;
  connectorId: string;
  request: KibanaRequest<unknown, unknown, RequestBody>;
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

  if (typeof readable?.toReadableStream !== 'function') {
    throw new Error('Action result status is error: result is not streamable');
  }
  // for await (const chunk of readable) {
  //   console.log('chunk', chunk);
  // }

  console.log('before toReadableStream');
  const rs = readable.toReadableStream();
  console.log('after toReadableStream', rs);
  return Readable.from(rs).pipe(new PassThrough());
  // const transformStream = readable.toReadableStream();
  //   new ReadableStream({
  //   async start(controller) {
  //     for await (const chunk of readable) {
  //       console.log('chunk', chunk);
  //       controller.enqueue(chunk);
  //     }
  //     controller.close();
  //   },
  // });
  console.timeEnd('transformStream');
  console.log('transformStream', transformStream);

  return Readable.from(transformStream).pipe(new PassThrough());
  return transformStream; // .pipe(new PassThrough());
};
