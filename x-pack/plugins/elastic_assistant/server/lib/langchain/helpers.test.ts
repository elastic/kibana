/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/elastic-assistant';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from 'langchain/schema';

import {
  getLangChainMessage,
  getLangChainMessages,
  getMessageContentAndRole,
  unsafeGetAssistantMessagesFromRequest,
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

  describe('unsafeGetAssistantMessagesFromRequest', () => {
    const rawSubActionParamsBody = {
      messages: [
        { role: 'user', content: '\n\n\n\nWhat is my name?' },
        {
          role: 'assistant',
          content:
            "Hello! Since we are communicating through text, I do not have the information about your name. Please feel free to share your name with me, if you'd like.",
        },
        { role: 'user', content: '\n\nMy name is Andrew' },
        {
          role: 'assistant',
          content:
            "Hi, Andrew! It's nice to meet you. How can I help you or what would you like to talk about today?",
        },
        { role: 'user', content: '\n\nDo you know my name?' },
      ],
    };

    it('returns the expected assistant messages from a conversation', () => {
      const result = unsafeGetAssistantMessagesFromRequest(JSON.stringify(rawSubActionParamsBody));

      const expected = [
        { role: 'user', content: '\n\n\n\nWhat is my name?' },
        {
          role: 'assistant',
          content:
            "Hello! Since we are communicating through text, I do not have the information about your name. Please feel free to share your name with me, if you'd like.",
        },
        { role: 'user', content: '\n\nMy name is Andrew' },
        {
          role: 'assistant',
          content:
            "Hi, Andrew! It's nice to meet you. How can I help you or what would you like to talk about today?",
        },
        { role: 'user', content: '\n\nDo you know my name?' },
      ];

      expect(result).toEqual(expected);
    });

    it('returns an empty array when the rawSubActionParamsBody is undefined', () => {
      const result = unsafeGetAssistantMessagesFromRequest(undefined);

      expect(result).toEqual([]);
    });

    it('returns an empty array when the rawSubActionParamsBody messages[] array is empty', () => {
      const hasEmptyMessages = {
        messages: [],
      };

      const result = unsafeGetAssistantMessagesFromRequest(JSON.stringify(hasEmptyMessages));

      expect(result).toEqual([]);
    });

    it('returns an empty array when the rawSubActionParamsBody shape is unexpected', () => {
      const unexpected = { invalidKey: 'some_value' };

      const result = unsafeGetAssistantMessagesFromRequest(JSON.stringify(unexpected));

      expect(result).toEqual([]);
    });

    it('returns an empty array when the rawSubActionParamsBody is invalid JSON', () => {
      const result = unsafeGetAssistantMessagesFromRequest('[]');

      expect(result).toEqual([]);
    });
  });
});
