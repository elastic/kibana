/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import type { InferenceExecutor } from '../../utils/inference_executor';
import { MessageRole } from '../../../../common/chat_complete';
import { ToolChoiceType } from '../../../../common/chat_complete/tools';
import { bedrockClaudeAdapter } from './bedrock_claude_adapter';
import { addNoToolUsageDirective } from './prompts';

describe('bedrockClaudeAdapter', () => {
  const executorMock = {
    invoke: jest.fn(),
  } as InferenceExecutor & { invoke: jest.MockedFn<InferenceExecutor['invoke']> };

  beforeEach(() => {
    executorMock.invoke.mockReset();
    executorMock.invoke.mockImplementation(async () => {
      return {
        actionId: '',
        status: 'ok',
        data: new PassThrough(),
      };
    });
  });

  function getCallParams() {
    const params = executorMock.invoke.mock.calls[0][0].subActionParams as Record<string, any>;
    return {
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      toolChoice: params.toolChoice,
    };
  }

  describe('#chatComplete()', () => {
    it('calls `executor.invoke` with the right fixed parameters', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);
      expect(executorMock.invoke).toHaveBeenCalledWith({
        subAction: 'invokeStream',
        subActionParams: {
          messages: [
            {
              role: 'user',
              rawContent: [{ type: 'text', text: 'question' }],
            },
          ],
          temperature: 0,
          stopSequences: ['\n\nHuman:'],
        },
      });
    });

    it('correctly format tools', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        tools: {
          myFunction: {
            description: 'myFunction',
          },
          myFunctionWithArgs: {
            description: 'myFunctionWithArgs',
            schema: {
              type: 'object',
              properties: {
                foo: {
                  type: 'string',
                  description: 'foo',
                },
              },
              required: ['foo'],
            },
          },
        },
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { tools } = getCallParams();
      expect(tools).toEqual([
        {
          name: 'myFunction',
          description: 'myFunction',
          input_schema: {
            properties: {},
            type: 'object',
          },
        },
        {
          name: 'myFunctionWithArgs',
          description: 'myFunctionWithArgs',
          input_schema: {
            properties: {
              foo: {
                description: 'foo',
                type: 'string',
              },
            },
            required: ['foo'],
            type: 'object',
          },
        },
      ]);
    });

    it('correctly format messages', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
          {
            role: MessageRole.Assistant,
            content: 'answer',
          },
          {
            role: MessageRole.User,
            content: 'another question',
          },
          {
            role: MessageRole.Assistant,
            content: null,
            toolCalls: [
              {
                function: {
                  name: 'my_function',
                  arguments: {
                    foo: 'bar',
                  },
                },
                toolCallId: '0',
              },
            ],
          },
          {
            role: MessageRole.Tool,
            toolCallId: '0',
            response: {
              bar: 'foo',
            },
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { messages } = getCallParams();
      expect(messages).toEqual([
        {
          rawContent: [
            {
              text: 'question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        {
          rawContent: [
            {
              text: 'answer',
              type: 'text',
            },
          ],
          role: 'assistant',
        },
        {
          rawContent: [
            {
              text: 'another question',
              type: 'text',
            },
          ],
          role: 'user',
        },
        {
          rawContent: [
            {
              id: '0',
              input: {
                foo: 'bar',
              },
              name: 'my_function',
              type: 'tool_use',
            },
          ],
          role: 'assistant',
        },
        {
          rawContent: [
            {
              content: '{"bar":"foo"}',
              tool_use_id: '0',
              type: 'tool_result',
            },
          ],
          role: 'user',
        },
      ]);
    });

    it('correctly format system message', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        system: 'Some system message',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { system } = getCallParams();
      expect(system).toEqual('Some system message');
    });

    it('correctly format tool choice', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        toolChoice: ToolChoiceType.required,
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice } = getCallParams();
      expect(toolChoice).toEqual({
        type: 'any',
      });
    });

    it('correctly format tool choice for named function', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        toolChoice: { function: 'foobar' },
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice } = getCallParams();
      expect(toolChoice).toEqual({
        type: 'tool',
        name: 'foobar',
      });
    });

    it('correctly adapt the request for ToolChoiceType.None', () => {
      bedrockClaudeAdapter.chatComplete({
        executor: executorMock,
        system: 'some system instruction',
        messages: [
          {
            role: MessageRole.User,
            content: 'question',
          },
        ],
        tools: {
          myFunction: {
            description: 'myFunction',
          },
        },
        toolChoice: ToolChoiceType.none,
      });

      expect(executorMock.invoke).toHaveBeenCalledTimes(1);

      const { toolChoice, tools, system } = getCallParams();
      expect(toolChoice).toBeUndefined();
      expect(tools).toEqual([]);
      expect(system).toEqual(addNoToolUsageDirective('some system instruction'));
    });
  });
});
