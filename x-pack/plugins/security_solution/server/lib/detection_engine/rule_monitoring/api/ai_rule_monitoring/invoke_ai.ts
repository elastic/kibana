/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeExecutorResult } from '@kbn/actions-plugin/common';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface InvokeAIActionsParams {
  subActionParams: {
    messages: AiMessage[];
    model?: string;
    n?: number;
    stop?: string | string[] | null;
    temperature?: number;
  };
  subAction: 'invokeAI' | 'invokeStream';
}

interface InvokeAiParams {
  connectorId: string;
  actionsClient: ActionsClient;
  messages: AiMessage[];
}

export async function invokeAi({
  connectorId,
  actionsClient,
  messages,
}: InvokeAiParams): Promise<string> {
  const connector = await getConnector(connectorId, actionsClient);
  const genAiConnectorParams: InvokeAIActionsParams = {
    subActionParams: {
      messages,
      model: connector.config?.defaultModel,
      n: 1,
      temperature: 0.2,
    },
    subAction: 'invokeAI',
  };
  const result = await actionsClient.execute({
    actionId: connectorId,
    params: genAiConnectorParams as unknown as Record<string, unknown>,
  });

  return isSuccessGenAiExecutorResult(result) ? result.data.message : `Error: ${result.data}`;
}

async function getConnector(connectorId: string, actionsClient: ActionsClient): Promise<Connector> {
  const connector = await actionsClient.get({ id: connectorId });

  if (connector.actionTypeId !== '.gen-ai') {
    throw new Error('Specified connector is not a Gen AI connector.');
  }

  return connector;
}

interface GenAiExecutorResultData {
  message: string;
}

function isSuccessGenAiExecutorResult(
  result: unknown
): result is ActionTypeExecutorResult<GenAiExecutorResultData> & {
  data: GenAiExecutorResultData;
} {
  const unsafeResult = result as ActionTypeExecutorResult<GenAiExecutorResultData>;

  return (
    unsafeResult &&
    typeof unsafeResult?.actionId === 'string' &&
    unsafeResult?.status === 'ok' &&
    Boolean(unsafeResult.data) &&
    Boolean(unsafeResult.data?.message)
  );
}
