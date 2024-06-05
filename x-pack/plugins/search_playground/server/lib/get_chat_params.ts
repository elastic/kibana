/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPENAI_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { v4 as uuidv4 } from 'uuid';
import { BEDROCK_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/common/bedrock/constants';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import {
  ActionsClientChatOpenAI,
  ActionsClientLlm,
  getDefaultArguments,
} from '@kbn/langchain/server';
import { Prompt } from '../../common/prompt';

export const getChatParams = async (
  {
    connectorId,
    model,
    prompt,
    citations,
  }: { connectorId: string; model?: string; prompt: string; citations: boolean },
  {
    actions,
    request,
    logger,
  }: {
    actions: ActionsPluginStartContract;
    logger: Logger;
    request: KibanaRequest;
  }
): Promise<{ chatModel: BaseLanguageModel; chatPrompt: string; connector: Connector }> => {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const connector = await actionsClient.get({ id: connectorId });
  let chatModel;
  let chatPrompt;

  switch (connector.actionTypeId) {
    case OPENAI_CONNECTOR_ID:
      chatModel = new ActionsClientChatOpenAI({
        actions,
        logger,
        request,
        connectorId,
        model,
        traceId: uuidv4(),
        signal: abortSignal,
        temperature: getDefaultArguments().temperature,
        // prevents the agent from retrying on failure
        // failure could be due to bad connector, we should deliver that result to the client asap
        maxRetries: 0,
      });
      chatPrompt = Prompt(prompt, {
        citations,
        context: true,
        type: 'openai',
      });
      break;
    case BEDROCK_CONNECTOR_ID:
      const llmType = 'bedrock';
      chatModel = new ActionsClientLlm({
        actions,
        logger,
        request,
        connectorId,
        model,
        traceId: uuidv4(),
        llmType,
        temperature: getDefaultArguments(llmType).temperature,
      });
      chatPrompt = Prompt(prompt, {
        citations,
        context: true,
        type: 'anthropic',
      });
      break;
    default:
      break;
  }

  if (!chatModel || !chatPrompt) {
    throw new Error('Invalid connector id');
  }

  return { chatModel, chatPrompt, connector };
};
