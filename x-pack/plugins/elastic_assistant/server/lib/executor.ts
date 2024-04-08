/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { KibanaRequest } from '@kbn/core-http-server';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { PassThrough, Readable } from 'stream';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';
import { Logger } from '@kbn/core/server';
import { handleStreamStorage } from './parse_stream';

export interface Props {
  onLlmResponse?: (content: string) => Promise<void>;
  abortSignal?: AbortSignal;
  actions: ActionsPluginStart;
  connectorId: string;
  params: InvokeAIActionsParams;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  actionTypeId: string;
  logger: Logger;
}
interface StaticResponse {
  connector_id: string;
  data: string;
  status: string;
}

interface InvokeAIActionsParams {
  subActionParams: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    n?: number;
    stop?: string | string[] | null;
    stopSequences?: string[];
    temperature?: number;
  };
  subAction: 'invokeAI' | 'invokeStream';
}

export const executeAction = async ({
  onLlmResponse,
  actions,
  params,
  connectorId,
  actionTypeId,
  request,
  logger,
  abortSignal,
}: Props): Promise<StaticResponse | Readable> => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const actionResult = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: params.subAction,
      subActionParams: {
        ...params.subActionParams,
        signal: abortSignal,
      },
    },
  });

  if (actionResult.status === 'error') {
    throw new Error(
      `Action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
    );
  }
  const content = get('data.message', actionResult);
  if (typeof content === 'string') {
    if (onLlmResponse) {
      await onLlmResponse(content);
    }
    return {
      connector_id: connectorId,
      data: content, // the response from the actions framework
      status: 'ok',
    };
  }

  const readable = get('data', actionResult) as Readable;
  if (typeof readable?.read !== 'function') {
    throw new Error('Action result status is error: result is not streamable');
  }

  // do not await, blocks stream for UI
  handleStreamStorage({
    actionTypeId,
    onMessageSent: onLlmResponse,
    logger,
    responseStream: readable,
    abortSignal,
  });

  return readable.pipe(new PassThrough());
};
