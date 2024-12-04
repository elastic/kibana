/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { FakeListChatModel, FakeStreamingLLM } from '@langchain/core/utils/testing';
import { createAssist as Assist } from '../utils/assist';
import { ConversationalChain, contextLimitCheck } from './conversational_chain';
import { ChatMessage, MessageRole } from '../types';

describe('conversational chain', () => {
  const createTestChain = async ({
    responses,
    chat,
    expectedFinalAnswer,
    expectedDocs,
    expectedTokens,
    expectedSearchRequest,
    contentField = { index: 'field', website: 'body_content' },
    isChatModel = true,
    docs,
    expectedHasClipped = false,
    modelLimit,
  }: {
    responses: string[];
    chat: ChatMessage[];
    expectedFinalAnswer?: string;
    expectedDocs?: any;
    expectedTokens?: any;
    expectedSearchRequest?: any;
    contentField?: Record<string, string>;
    isChatModel?: boolean;
    docs?: any;
    expectedHasClipped?: boolean;
    modelLimit?: number;
  }) => {
    if (expectedHasClipped) {
      expect.assertions(1);
    }

    const searchMock = jest.fn().mockImplementation(() => {
      return {
        hits: {
          hits: docs ?? [
            {
              _index: 'index',
              _id: '1',
              _source: {
                field: 'value',
              },
            },
            {
              _index: 'website',
              _id: '1',
              _source: {
                body_content: 'value2',
                metadata: {
                  source: 'value3',
                },
              },
            },
          ],
        },
      };
    });

    const mockElasticsearchClient = {
      transport: {
        request: searchMock,
      },
    };

    const llm = isChatModel
      ? new FakeListChatModel({
          responses,
        })
      : new FakeStreamingLLM({ responses });

    const aiClient = Assist({
      es_client: mockElasticsearchClient as unknown as Client,
    });

    const conversationalChain = ConversationalChain({
      model: llm as unknown as BaseChatModel,
      rag: {
        index: 'index,website',
        retriever: (question: string) => ({
          query: {
            match: {
              field: question,
            },
          },
        }),
        content_field: contentField,
        size: 3,
        inputTokensLimit: modelLimit,
      },
      prompt: 'you are a QA bot {context}',
      questionRewritePrompt: 'rewrite question {question} using {context}"',
    });

    try {
      const stream = await conversationalChain.stream(aiClient, chat);

      const streamToValue: string[] = await new Promise((resolve, reject) => {
        const reader = stream.getReader();
        const textDecoder = new TextDecoder();
        const chunks: string[] = [];

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              resolve(chunks);
            } else {
              chunks.push(textDecoder.decode(value));
              read();
            }
          }, reject);
        };
        read();
      });

      const textValue = streamToValue
        .filter((v) => v[0] === '0')
        .reduce((acc, v) => acc + v.replace(/0:"(.*)"\n/, '$1'), '');
      expect(textValue).toEqual(expectedFinalAnswer);

      const annotations = streamToValue
        .filter((v) => v[0] === '8')
        .map((entry) => entry.replace(/8:(.*)\n/, '$1'), '')
        .map((entry) => JSON.parse(entry))
        .reduce((acc, v) => acc.concat(v), []);

      const docValues = annotations.filter((v: { type: string }) => v.type === 'retrieved_docs');
      const tokens = annotations.filter((v: { type: string }) => v.type.endsWith('_token_count'));
      const hasClipped = !!annotations.some((v: { type: string }) => v.type === 'context_clipped');
      expect(docValues).toEqual(expectedDocs);
      expect(tokens).toEqual(expectedTokens);
      expect(hasClipped).toEqual(expectedHasClipped);
      expect(searchMock.mock.calls[0]).toEqual(expectedSearchRequest);
    } catch (error) {
      if (expectedHasClipped) {
        expect(error).toMatchInlineSnapshot(`[ContextLimitError: Context exceeds the model limit]`);
      } else {
        throw error;
      }
    }
  };

  it('should be able to create a conversational chain', async () => {
    await createTestChain({
      responses: ['the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      expectedDocs: [
        {
          documents: [
            { metadata: { _id: '1', _index: 'index' }, pageContent: 'value' },
            { metadata: { _id: '1', _index: 'website' }, pageContent: 'value2' },
          ],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 15 },
        { type: 'prompt_token_count', count: 28 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'what is the work from home policy?' } }, size: 3 },
        },
      ],
    });
  }, 10000);

  it('should be able to create a conversational chain with nested field', async () => {
    await createTestChain({
      responses: ['the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      expectedDocs: [
        {
          documents: [
            { metadata: { _id: '1', _index: 'index' }, pageContent: 'value' },
            { metadata: { _id: '1', _index: 'website' }, pageContent: 'value3' },
          ],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 15 },
        { type: 'prompt_token_count', count: 28 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'what is the work from home policy?' } }, size: 3 },
        },
      ],
      contentField: { index: 'field', website: 'metadata.source' },
    });
  }, 10000);

  it('should be able to create a conversational chain with inner hit field', async () => {
    await createTestChain({
      responses: ['the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      docs: [
        {
          _index: 'index',
          _id: '1',
          inner_hits: {
            'index.field': {
              hits: {
                hits: [
                  {
                    _source: {
                      text: 'value',
                    },
                  },
                ],
              },
            },
          },
        },
      ],
      expectedDocs: [
        {
          documents: [{ metadata: { _id: '1', _index: 'index' }, pageContent: 'value' }],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 7 },
        { type: 'prompt_token_count', count: 20 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'what is the work from home policy?' } }, size: 3 },
        },
      ],
      contentField: { index: 'field' },
    });
  }, 10000);

  it('asking with chat history should re-write the question', async () => {
    await createTestChain({
      responses: ['rewrite the question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: MessageRole.assistant,
          content: 'the final answer',
        },
        {
          id: '3',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      expectedDocs: [
        {
          documents: [
            { metadata: { _id: '1', _index: 'index' }, pageContent: 'value' },
            { metadata: { _id: '1', _index: 'website' }, pageContent: 'value2' },
          ],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 15 },
        { type: 'prompt_token_count', count: 39 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'rewrite the question' } }, size: 3 },
        },
      ],
    });
  }, 10000);

  it('should omit the system messages in chat', async () => {
    await createTestChain({
      responses: ['the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: MessageRole.system,
          content: 'Error occurred. Please try again.',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      expectedDocs: [
        {
          documents: [
            { metadata: { _id: '1', _index: 'index' }, pageContent: 'value' },
            { metadata: { _id: '1', _index: 'website' }, pageContent: 'value2' },
          ],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 15 },
        { type: 'prompt_token_count', count: 28 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'what is the work from home policy?' } }, size: 3 },
        },
      ],
    });
  }, 10000);

  it('should cope with quotes in the query', async () => {
    await createTestChain({
      responses: ['rewrite "the" question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: MessageRole.assistant,
          content: 'the final answer',
        },
        {
          id: '3',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      expectedDocs: [
        {
          documents: [
            { metadata: { _id: '1', _index: 'index' }, pageContent: 'value' },
            { metadata: { _id: '1', _index: 'website' }, pageContent: 'value2' },
          ],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 15 },
        { type: 'prompt_token_count', count: 39 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'rewrite "the" question' } }, size: 3 },
        },
      ],
    });
  }, 10000);

  it('should work with an LLM based model', async () => {
    await createTestChain({
      responses: ['rewrite "the" question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: MessageRole.assistant,
          content: 'the final answer',
        },
        {
          id: '3',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      expectedFinalAnswer: 'the final answer',
      expectedDocs: [
        {
          documents: [
            { metadata: { _id: '1', _index: 'index' }, pageContent: 'value' },
            { metadata: { _id: '1', _index: 'website' }, pageContent: 'value2' },
          ],
          type: 'retrieved_docs',
        },
      ],
      expectedTokens: [
        { type: 'context_token_count', count: 15 },
        { type: 'prompt_token_count', count: 49 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'rewrite "the" question' } }, size: 3 },
        },
      ],
      isChatModel: false,
    });
  }, 10000);

  it('should clip the conversation', async () => {
    await createTestChain({
      responses: ['rewrite "the" question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: MessageRole.assistant,
          content: 'the final answer',
        },
        {
          id: '3',
          role: MessageRole.user,
          content: 'what is the work from home policy?',
        },
      ],
      docs: [
        {
          _index: 'index',
          _id: '1',
          _source: {
            body_content: 'value',
          },
        },
        {
          _index: 'website',
          _id: '1',
          _source: {
            body_content: Array.from({ length: 1000 }, (_, i) => `${i}value\n `).join(' '),
          },
        },
      ],
      modelLimit: 100,
      expectedHasClipped: true,
      isChatModel: false,
    });
  }, 10000);

  describe('contextLimitCheck', () => {
    const prompt = ChatPromptTemplate.fromTemplate(
      'you are a QA bot {question} {chat_history} {context}'
    );

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should return the input as is if modelLimit is undefined', async () => {
      const input = {
        context: 'This is a test context.',
        question: 'This is a test question.',
        chat_history: 'This is a test chat history.',
      };
      jest.spyOn(prompt, 'format');
      const result = await contextLimitCheck(undefined, prompt)(input);

      expect(result).toBe(input);
      expect(prompt.format).not.toHaveBeenCalled();
    });

    it('should return the input if within modelLimit', async () => {
      const input = {
        context: 'This is a test context.',
        question: 'This is a test question.',
        chat_history: 'This is a test chat history.',
      };
      jest.spyOn(prompt, 'format');
      const result = await contextLimitCheck(10000, prompt)(input);
      expect(result).toEqual(input);
      expect(prompt.format).toHaveBeenCalledWith(input);
    });

    it('should clip context if exceeds modelLimit', async () => {
      expect.assertions(1);
      const input = {
        context: 'This is a test context.\nThis is another line.\nAnd another one.',
        question: 'This is a test question.',
        chat_history: 'This is a test chat history.',
      };

      await expect(contextLimitCheck(33, prompt)(input)).rejects.toMatchInlineSnapshot(
        `[ContextLimitError: Context exceeds the model limit]`
      );
    });
  });
});
