/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChatParams } from './get_chat_params';
import { ActionsClientChatOpenAI, ActionsClientLlm } from '@kbn/langchain/server';
import {
  OPENAI_CONNECTOR_ID,
  BEDROCK_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/public/common';
import { Prompt } from '../../common/prompt';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

jest.mock('@kbn/langchain/server', () => {
  const original = jest.requireActual('@kbn/langchain/server');
  return {
    ...original,
    ActionsClientChatOpenAI: jest.fn(),
    ActionsClientLlm: jest.fn(),
  };
});

jest.mock('../../common/prompt', () => ({
  Prompt: jest.fn((instructions) => instructions),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('getChatParams', () => {
  const mockActionsClient = {
    get: jest.fn(),
  };
  const actions = {
    getActionsClientWithRequest: jest.fn(() => Promise.resolve(mockActionsClient)),
  } as unknown as ActionsPluginStartContract;

  const logger = jest.fn() as unknown as Logger;
  const request = jest.fn() as unknown as KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the correct chat model and prompt for OPENAI_CONNECTOR_ID', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '1', actionTypeId: OPENAI_CONNECTOR_ID });

    const result = await getChatParams(
      {
        connectorId: '1',
        model: 'text-davinci-003',
        prompt: 'Hello, world!',
        citations: true,
      },
      { actions, request, logger }
    );
    expect(Prompt).toHaveBeenCalledWith('Hello, world!', {
      citations: true,
      context: true,
      type: 'openai',
    });
    expect(ActionsClientChatOpenAI).toHaveBeenCalledWith(expect.anything());
    expect(result.chatPrompt).toContain('Hello, world!');
  });

  it('returns the correct chat model and prompt for BEDROCK_CONNECTOR_ID', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '2', actionTypeId: BEDROCK_CONNECTOR_ID });

    const result = await getChatParams(
      {
        connectorId: '2',
        model: 'custom-model',
        prompt: 'How does it work?',
        citations: false,
      },
      { actions, request, logger }
    );

    expect(Prompt).toHaveBeenCalledWith('How does it work?', {
      citations: false,
      context: true,
      type: 'anthropic',
    });
    expect(ActionsClientLlm).toHaveBeenCalledWith({
      temperature: 0,
      llmType: 'bedrock',
      traceId: 'test-uuid',
      logger: expect.anything(),
      model: 'custom-model',
      connectorId: '2',
      actionsClient: expect.anything(),
    });
    expect(result.chatPrompt).toContain('How does it work?');
  });

  it('throws an error for invalid connector id', async () => {
    mockActionsClient.get.mockResolvedValue({ id: '3', actionTypeId: 'unknown' });

    await expect(
      getChatParams(
        {
          connectorId: '3',
          prompt: 'This should fail.',
          citations: false,
        },
        { actions, request, logger }
      )
    ).rejects.toThrow('Invalid connector id');
  });
});
