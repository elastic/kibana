/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { ActionsClientLlm } from './actions_client_llm';
import { mockActionResponse } from '../../../__mocks__/action_result_data';
import { RequestBody } from '../types';

const connectorId = 'mock-connector-id';

const mockExecute = jest.fn().mockImplementation(() => ({
  data: mockActionResponse,
  status: 'ok',
}));

const mockLogger = loggerMock.create();

const mockActions = {
  getActionsClientWithRequest: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
} as unknown as ActionsPluginStart;

const mockRequest: KibanaRequest<unknown, unknown, RequestBody> = {
  params: { connectorId },
  body: {
    params: {
      subActionParams: {
        messages: [
          { role: 'user', content: '\\n\\n\\n\\nWhat is my name?' },
          {
            role: 'assistant',
            content:
              "I'm sorry, but I don't have the information about your name. You can tell me your name if you'd like, and we can continue our conversation from there.",
          },
          { role: 'user', content: '\\n\\nMy name is Andrew' },
          {
            role: 'assistant',
            content:
              "Hello, Andrew! It's nice to meet you. What would you like to talk about today?",
          },
          { role: 'user', content: '\\n\\nDo you know my name?' },
        ],
      },
      subAction: 'invokeAI',
    },
    assistantLangChain: true,
  },
} as KibanaRequest<unknown, unknown, RequestBody>;

const prompt = 'Do you know my name?';

describe('ActionsClientLlm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActionResultData', () => {
    it('returns the expected data', async () => {
      const actionsClientLlm = new ActionsClientLlm({
        actions: mockActions,
        connectorId,
        logger: mockLogger,
        request: mockRequest,
      });

      await actionsClientLlm._call(prompt); // ignore the result

      expect(actionsClientLlm.getActionResultData()).toEqual(mockActionResponse.message);
    });
  });

  describe('_llmType', () => {
    it('returns the expected LLM type', () => {
      const actionsClientLlm = new ActionsClientLlm({
        actions: mockActions,
        connectorId,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(actionsClientLlm._llmType()).toEqual('ActionsClientLlm');
    });

    it('returns the expected LLM type when overridden', () => {
      const actionsClientLlm = new ActionsClientLlm({
        actions: mockActions,
        connectorId,
        llmType: 'special-llm-type',
        logger: mockLogger,
        request: mockRequest,
      });

      expect(actionsClientLlm._llmType()).toEqual('special-llm-type');
    });
  });

  describe('_call', () => {
    it('returns the expected content when _call is invoked', async () => {
      const actionsClientLlm = new ActionsClientLlm({
        actions: mockActions,
        connectorId,
        logger: mockLogger,
        request: mockRequest,
      });

      const result = await actionsClientLlm._call(prompt);

      expect(result).toEqual('Yes, your name is Andrew. How can I assist you further, Andrew?');
    });

    it('rejects with the expected error when the action result status is error', async () => {
      const hasErrorStatus = jest.fn().mockImplementation(() => ({
        message: 'action-result-message',
        serviceMessage: 'action-result-service-message',
        status: 'error', // <-- error status
      }));

      const badActions = {
        getActionsClientWithRequest: jest.fn().mockImplementation(() => ({
          execute: hasErrorStatus,
        })),
      } as unknown as ActionsPluginStart;

      const actionsClientLlm = new ActionsClientLlm({
        actions: badActions,
        connectorId,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(actionsClientLlm._call(prompt)).rejects.toThrowError(
        'ActionsClientLlm: action result status is error: action-result-message - action-result-service-message'
      );
    });

    it('rejects with the expected error the message has invalid content', async () => {
      const invalidContent = { message: 1234 };

      mockExecute.mockImplementation(() => ({
        data: invalidContent,
        status: 'ok',
      }));

      const actionsClientLlm = new ActionsClientLlm({
        actions: mockActions,
        connectorId,
        logger: mockLogger,
        request: mockRequest,
      });

      expect(actionsClientLlm._call(prompt)).rejects.toThrowError(
        'ActionsClientLlm: content should be a string, but it had an unexpected type: number'
      );
    });
  });
});
