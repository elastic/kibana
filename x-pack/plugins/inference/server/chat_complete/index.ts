/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { defer, switchMap, throwError } from 'rxjs';
import type { ChatCompleteAPI, ChatCompletionResponse } from '../../common/chat_complete';
import type { ToolOptions } from '../../common/chat_complete/tools';
import { InferenceConnectorType } from '../../common/connectors';
import { createInferenceRequestError } from '../../common/errors';
import type { InferenceStartDependencies } from '../types';
import { chunksIntoMessage } from './adapters/chunks_into_message';
import { openAIAdapter } from './adapters/openai';

export function createChatCompleteApi({
  request,
  actions,
}: {
  request: KibanaRequest;
  actions: InferenceStartDependencies['actions'];
}) {
  const chatCompleteAPI: ChatCompleteAPI = ({
    connectorId,
    messages,
    toolChoice,
    tools,
    system,
  }): ChatCompletionResponse<ToolOptions> => {
    return defer(async () => {
      const actionsClient = await actions.getActionsClientWithRequest(request);

      const connector = await actionsClient.get({ id: connectorId, throwIfSystemAction: true });

      return { actionsClient, connector };
    }).pipe(
      switchMap(({ actionsClient, connector }) => {
        switch (connector.actionTypeId) {
          case InferenceConnectorType.OpenAI:
            return openAIAdapter.chatComplete({
              system,
              connector,
              actionsClient,
              messages,
              toolChoice,
              tools,
            });

          case InferenceConnectorType.Bedrock:
            break;

          case InferenceConnectorType.Gemini:
            break;
        }

        return throwError(() =>
          createInferenceRequestError(
            `Adapter for type ${connector.actionTypeId} not implemented`,
            400
          )
        );
      }),
      chunksIntoMessage({
        toolChoice,
        tools,
      })
    );
  };

  return chatCompleteAPI;
}
