/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { last } from 'lodash';
import { defer, switchMap, throwError } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ChatCompleteAPI, ChatCompletionResponse } from '../../common/chat_complete';
import { createInferenceRequestError } from '../../common/errors';
import type { InferenceStartDependencies } from '../types';
import { getConnectorById } from '../util/get_connector_by_id';
import { getInferenceAdapter } from './adapters';
import { createInferenceExecutor, chunksIntoMessage } from './utils';

export function createChatCompleteApi({
  request,
  actions,
  logger,
}: {
  request: KibanaRequest;
  actions: InferenceStartDependencies['actions'];
  logger: Logger;
}) {
  const chatCompleteAPI: ChatCompleteAPI = ({
    connectorId,
    messages,
    toolChoice,
    tools,
    system,
    functionCalling,
  }): ChatCompletionResponse => {
    return defer(async () => {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connector = await getConnectorById({ connectorId, actionsClient });
      const executor = createInferenceExecutor({ actionsClient, connector });
      return { executor, connector };
    }).pipe(
      switchMap(({ executor, connector }) => {
        const connectorType = connector.type;
        const inferenceAdapter = getInferenceAdapter(connectorType);

        if (!inferenceAdapter) {
          return throwError(() =>
            createInferenceRequestError(`Adapter for type ${connectorType} not implemented`, 400)
          );
        }

        logger.debug(() => `Sending request, last message is: ${JSON.stringify(last(messages))}`);
        logger.trace(() => JSON.stringify({ messages, toolChoice, tools, system }));

        return inferenceAdapter.chatComplete({
          system,
          executor,
          messages,
          toolChoice,
          tools,
          logger,
          functionCalling,
        });
      }),
      chunksIntoMessage({
        toolOptions: {
          toolChoice,
          tools,
        },
        logger,
      })
    );
  };

  return chatCompleteAPI;
}
