/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/logging';
import dedent from 'dedent';
import { last } from 'lodash';
import { MessageRole } from '../../../../../common';
import { createBedrockClaudeAdapter } from './bedrock_claude_adapter';
import { LlmApiAdapterFactory } from '../types';
import { TOOL_USE_END, TOOL_USE_START } from '../simulate_function_calling/constants';

describe('createBedrockClaudeAdapter', () => {
  describe('getSubAction', () => {
    function callSubActionFactory(overrides?: Partial<Parameters<LlmApiAdapterFactory>[0]>) {
      const subActionParams = createBedrockClaudeAdapter({
        logger: {
          debug: jest.fn(),
        } as unknown as Logger,
        functions: [
          {
            name: 'my_tool',
            description: 'My tool',
            parameters: {
              properties: {
                myParam: {
                  type: 'string',
                },
              },
            },
          },
        ],
        messages: [
          {
            '@timestamp': new Date().toString(),
            message: {
              role: MessageRole.System,
              content: '',
            },
          },
          {
            '@timestamp': new Date().toString(),
            message: {
              role: MessageRole.User,
              content: 'How can you help me?',
            },
          },
        ],
        ...overrides,
      }).getSubAction().subActionParams as {
        temperature: number;
        messages: Array<{ role: string; content: string }>;
      };

      return {
        ...subActionParams,
        messages: subActionParams.messages.map((msg) => ({ ...msg, content: dedent(msg.content) })),
      };
    }
    describe('with functions', () => {
      it('sets the temperature to 0', () => {
        expect(callSubActionFactory().temperature).toEqual(0);
      });

      it('formats the functions', () => {
        expect(callSubActionFactory().messages[0].content).toContain(
          dedent(
            JSON.stringify([
              {
                name: 'my_tool',
                description: 'My tool',
                parameters: {
                  properties: {
                    myParam: {
                      type: 'string',
                    },
                  },
                },
              },
            ])
          )
        );
      });

      it('replaces mentions of functions with tools', () => {
        const messages = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content:
                'Call the "esql" tool. You can chain successive function calls, using the functions available.',
            },
          },
        ];

        const content = callSubActionFactory({ messages }).messages[0].content;

        expect(content).not.toContain(`"esql" function`);
        expect(content).toContain(`"esql" tool`);
        expect(content).not.toContain(`functions`);
        expect(content).toContain(`tools`);
        expect(content).toContain(`tool calls`);
      });

      it('mentions to explicitly call the specified function if given', () => {
        expect(last(callSubActionFactory({ functionCall: 'my_tool' }).messages)!.content).toContain(
          'Remember, use the my_tool tool to answer this question.'
        );
      });

      it('formats the function requests as JSON', () => {
        const messages = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: '',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              function_call: {
                name: 'my_tool',
                arguments: JSON.stringify({ myParam: 'myValue' }),
                trigger: MessageRole.User as const,
              },
            },
          },
        ];

        expect(last(callSubActionFactory({ messages }).messages)!.content).toContain(
          dedent(`${TOOL_USE_START}
        \`\`\`json
        ${JSON.stringify({ name: 'my_tool', input: { myParam: 'myValue' } })}
        \`\`\`${TOOL_USE_END}`)
        );
      });

      it('formats errors', () => {
        const messages = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: '',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              function_call: {
                name: 'my_tool',
                arguments: JSON.stringify({ myParam: 'myValue' }),
                trigger: MessageRole.User as const,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'my_tool',
              content: JSON.stringify({ error: 'An internal server error occurred' }),
            },
          },
        ];

        expect(JSON.parse(last(callSubActionFactory({ messages }).messages)!.content)).toEqual({
          type: 'tool_result',
          tool: 'my_tool',
          error: 'An internal server error occurred',
          is_error: true,
        });
      });

      it('formats function responses as JSON', () => {
        const messages = [
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.System,
              content: '',
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.Assistant,
              function_call: {
                name: 'my_tool',
                arguments: JSON.stringify({ myParam: 'myValue' }),
                trigger: MessageRole.User as const,
              },
            },
          },
          {
            '@timestamp': new Date().toISOString(),
            message: {
              role: MessageRole.User,
              name: 'my_tool',
              content: JSON.stringify({ myResponse: { myParam: 'myValue' } }),
            },
          },
        ];

        expect(JSON.parse(last(callSubActionFactory({ messages }).messages)!.content)).toEqual({
          type: 'tool_result',
          tool: 'my_tool',
          myResponse: { myParam: 'myValue' },
        });
      });
    });
  });

  describe('streamIntoObservable', () => {
    // this data format is heavily encoded, so hard to reproduce.
    // will leave this empty until we have some sample data.
  });
});
