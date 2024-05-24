/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createAssist as Assist } from '../utils/assist';
import { ConversationalChain } from './conversational_chain';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { FakeListLLM } from 'langchain/llms/fake';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Message } from 'ai';

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
  }: {
    responses: string[];
    chat: Message[];
    expectedFinalAnswer: string;
    expectedDocs: any;
    expectedTokens: any;
    expectedSearchRequest: any;
    contentField?: Record<string, string>;
    isChatModel?: boolean;
  }) => {
    const searchMock = jest.fn().mockImplementation(() => {
      return {
        hits: {
          hits: [
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
      : new FakeListLLM({ responses });

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
      },
      prompt: 'you are a QA bot',
    });

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
    expect(docValues).toEqual(expectedDocs);
    expect(tokens).toEqual(expectedTokens);
    expect(searchMock.mock.calls[0]).toEqual(expectedSearchRequest);
  };

  it('should be able to create a conversational chain', async () => {
    await createTestChain({
      responses: ['the final answer'],
      chat: [
        {
          id: '1',
          role: 'user',
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
        { type: 'prompt_token_count', count: 5 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'what is the work from home policy?' } }, size: 3 },
        },
      ],
    });
  });

  it('should be able to create a conversational chain with nested field', async () => {
    await createTestChain({
      responses: ['the final answer'],
      chat: [
        {
          id: '1',
          role: 'user',
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
        { type: 'prompt_token_count', count: 5 },
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
  });

  it('asking with chat history should re-write the question', async () => {
    await createTestChain({
      responses: ['rewrite the question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: 'user',
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'the final answer',
        },
        {
          id: '3',
          role: 'user',
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
        { type: 'prompt_token_count', count: 5 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'rewrite the question' } }, size: 3 },
        },
      ],
    });
  });

  it('should cope with quotes in the query', async () => {
    await createTestChain({
      responses: ['rewrite "the" question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: 'user',
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'the final answer',
        },
        {
          id: '3',
          role: 'user',
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
        { type: 'prompt_token_count', count: 5 },
      ],
      expectedSearchRequest: [
        {
          method: 'POST',
          path: '/index,website/_search',
          body: { query: { match: { field: 'rewrite "the" question' } }, size: 3 },
        },
      ],
    });
  });

  it('should work with an LLM based model', async () => {
    await createTestChain({
      responses: ['rewrite "the" question', 'the final answer'],
      chat: [
        {
          id: '1',
          role: 'user',
          content: 'what is the work from home policy?',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'the final answer',
        },
        {
          id: '3',
          role: 'user',
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
        { type: 'prompt_token_count', count: 7 },
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
  });
});
