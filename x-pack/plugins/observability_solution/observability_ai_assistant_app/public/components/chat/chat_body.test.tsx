/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message } from '@kbn/observability-ai-assistant-plugin/common';
import { CONTEXT_FUNCTION_NAME } from '@kbn/observability-ai-assistant-plugin/server/functions/context';
import { reverseToLastUserMessage } from './chat_body';

describe('<ChatBody>', () => {
  describe('reverseToLastUserMessage', () => {
    const firstUserMessage = {
      message: {
        role: 'user',
        content: 'Give me a list of my APM services',
      },
    };
    const firstUserMessageIndex = 1;

    const secondUserMessage = {
      message: {
        role: 'user',
        content: 'Can you tell me about the synth-go-0 service',
      },
    };
    const secondUserMessageIndex = 7;

    const messages = [
      {
        message: {
          role: 'system',
          content: "You're the best around",
        },
      },
      firstUserMessage,
      {
        message: {
          role: 'assistant',
          function_call: {
            name: CONTEXT_FUNCTION_NAME,
            arguments: '{"queries":[],"categories":[]}',
            trigger: 'assistant',
          },
          content: '',
        },
      },
      {
        message: {
          role: 'user',
          name: CONTEXT_FUNCTION_NAME,
          content: '[]',
        },
      },
      {
        message: {
          role: 'assistant',
          function_call: {
            name: 'get_apm_services_list',
            arguments: '{\n  "start": "now-1h",\n  "end": "now"\n}',
            trigger: 'assistant',
          },
          content: '',
        },
      },
      {
        message: {
          role: 'user',
          name: 'get_apm_services_list',
          content: '[{"service.name":"synth-go-0"}]',
        },
      },
      {
        message: {
          role: 'assistant',
          function_call: {
            name: '',
            arguments: '',
            trigger: 'assistant',
          },
          content: 'Here is a list of your APM services:\n\n1. synth-go-0\n',
        },
      },
      secondUserMessage,
      {
        message: {
          role: 'assistant',
          function_call: {
            name: CONTEXT_FUNCTION_NAME,
            arguments: '{"queries":[],"categories":[]}',
            trigger: 'assistant',
          },
          content: '',
        },
      },
      {
        message: {
          role: 'user',
          name: CONTEXT_FUNCTION_NAME,
          content: '[]',
        },
      },
      {
        message: {
          role: 'assistant',
          function_call: {
            name: 'get_apm_service_summary',
            arguments:
              '{\n  "service.name": "synth-go-0",\n  "start": "now-1h",\n  "end": "now"\n}',
            trigger: 'assistant',
          },
          content: '',
        },
      },
      {
        message: {
          role: 'user',
          name: 'get_apm_service_summary',
          content: '{"service.name":"synth-go-0"}',
        },
      },
      {
        message: {
          role: 'assistant',
          function_call: {
            name: '',
            arguments: '',
            trigger: 'assistant',
          },
          content: 'The service named "synth-go-0" is really neat.',
        },
      },
    ] as unknown as Message[];

    it('goes back to the last written user message when regenerating from the end of the conversation', () => {
      const nextMessages = reverseToLastUserMessage(messages, messages.at(-1)!);
      expect(nextMessages).toEqual(messages.slice(0, secondUserMessageIndex + 1));
    });

    it('goes back to the last written user message when regenerating from the middle of the conversation', () => {
      const nextMessages = reverseToLastUserMessage(
        messages,
        messages.at(secondUserMessageIndex - 1)!
      );
      expect(nextMessages).toEqual(messages.slice(0, firstUserMessageIndex + 1));
    });
  });
});
