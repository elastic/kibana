/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import type { Message } from '@kbn/elastic-assistant';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';
import { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common';

import {
  getLangChainMessage,
  getLangChainMessages,
  getMessageContentAndRole,
  requestHasRequiredAnonymizationParams,
} from './helpers';
import { langChainMessages } from '../../__mocks__/lang_chain_messages';

describe('helpers', () => {
  describe('getLangChainMessage', () => {
    const testCases: Array<[Pick<Message, 'content' | 'role'>, typeof BaseMessage]> = [
      [
        {
          role: 'system',
          content: 'System message',
        },
        SystemMessage,
      ],
      [
        {
          role: 'user',
          content: 'User message',
        },
        HumanMessage,
      ],
      [
        {
          role: 'assistant',
          content: 'Assistant message',
        },
        AIMessage,
      ],
      [
        {
          role: 'unknown' as Message['role'],
          content: 'Unknown message',
        },
        HumanMessage,
      ],
    ];

    testCases.forEach(([testCase, expectedClass]) => {
      it(`returns the expected content when role is ${testCase.role}`, () => {
        const result = getLangChainMessage(testCase);

        expect(result.content).toEqual(testCase.content);
      });

      it(`returns the expected BaseMessage instance when role is ${testCase.role}`, () => {
        const result = getLangChainMessage(testCase);

        expect(result instanceof expectedClass).toBeTruthy();
      });
    });
  });

  describe('getLangChainMessages', () => {
    const assistantMessages: Array<Pick<Message, 'content' | 'role'>> = [
      {
        content: 'What is my name?',
        role: 'user',
      },
      {
        content:
          "I'm sorry, but I am not able to answer questions unrelated to Elastic Security. If you have any questions about Elastic Security, please feel free to ask.",
        role: 'assistant',
      },
      {
        content: '\n\nMy name is Andrew',
        role: 'user',
      },
      {
        content:
          "Hello Andrew! If you have any questions about Elastic Security, feel free to ask, and I'll do my best to help you.",
        role: 'assistant',
      },
      {
        content: '\n\nDo you know my name?',
        role: 'user',
      },
    ];

    it('returns the expected BaseMessage instances', () => {
      expect(getLangChainMessages(assistantMessages)).toEqual(langChainMessages);
    });
  });

  describe('getMessageContentAndRole', () => {
    const testCases: Array<[string, Pick<Message, 'content' | 'role'>]> = [
      ['Prompt 1', { content: 'Prompt 1', role: 'user' }],
      ['Prompt 2', { content: 'Prompt 2', role: 'user' }],
      ['', { content: '', role: 'user' }],
    ];

    testCases.forEach(([prompt, expectedOutput]) => {
      test(`Given the prompt "${prompt}", it returns the prompt as content with a "user" role`, () => {
        const result = getMessageContentAndRole(prompt);

        expect(result).toEqual(expectedOutput);
      });
    });
  });

  describe('requestHasRequiredAnonymizationParams', () => {
    it('returns true if the request has valid anonymization params', () => {
      const request = {
        body: {
          allow: ['a', 'b', 'c'],
          allowReplacement: ['b', 'c'],
          replacements: [{ uuid: 'key', value: 'value' }],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(true);
    });

    it('returns false if allow is undefined', () => {
      const request = {
        body: {
          // allow is undefined
          allowReplacement: ['b', 'c'],
          replacements: [{ uuid: 'key', value: 'value' }],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(false);
    });

    it('returns false if allow is empty', () => {
      const request = {
        body: {
          allow: [], // <-- empty
          allowReplacement: ['b', 'c'],
          replacements: [{ uuid: 'key', value: 'value' }],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(false);
    });

    it('returns false if allow has non-string values', () => {
      const request = {
        body: {
          allow: ['a', 9876, 'c'], // <-- non-string value
          allowReplacement: ['b', 'c'],
          replacements: [{ uuid: 'key', value: 'value' }],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(false);
    });

    it('returns true if allowReplacement is empty', () => {
      const request = {
        body: {
          allow: ['a', 'b', 'c'],
          allowReplacement: [],
          replacements: [{ uuid: 'key', value: 'value' }],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(true);
    });

    it('returns false if allowReplacement has non-string values', () => {
      const request = {
        body: {
          allow: ['a', 'b', 'c'],
          allowReplacement: ['b', 12345], // <-- non-string value
          replacements: [{ uuid: 'key', value: 'value' }],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(false);
    });

    it('returns true if replacements is empty', () => {
      const request = {
        body: {
          allow: ['a', 'b', 'c'],
          allowReplacement: ['b', 'c'],
          replacements: [],
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(true);
    });

    it('returns false if replacements has non-string values', () => {
      const request = {
        body: {
          allow: ['a', 'b', 'c'],
          allowReplacement: ['b', 'c'],
          replacements: [{ uuid: 'key', value: 76543 }], // <-- non-string value
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;

      const result = requestHasRequiredAnonymizationParams(request);

      expect(result).toBe(false);
    });
  });
});
