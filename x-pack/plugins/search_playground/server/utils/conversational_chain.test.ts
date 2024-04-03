/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { createAssist as Assist } from './assist';
import { ConversationalChain } from './conversational_chain';
import { FakeListLLM } from 'langchain/llms/fake';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

describe('conversational chain', () => {
  it('should be able to create a conversational chain', async () => {
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
              },
            },
          ],
        },
      };
    });

    const mockElasticsearchClient = {
      search: searchMock,
    };

    const llm = new FakeListLLM({
      responses: ['question rewritten to work from home', 'the final answer'],
    });

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
        content_field: { index: 'field', website: 'body_content' },
        size: 3,
      },
      prompt: 'you are a QA bot',
    });

    const stream = await conversationalChain.stream(aiClient, [
      {
        id: '1',
        role: 'user',
        content: 'what is the work from home policy?',
      },
    ]);

    const streamToValue: string[] = await new Promise((resolve) => {
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
        });
      };
      read();
    });

    const textValue = streamToValue
      .filter((v) => v[0] === '0')
      .reduce((acc, v) => acc + v.replace(/0:"(.*)"\n/, '$1'), '');
    expect(textValue).toEqual('the final answer');

    const docValue = streamToValue
      .filter((v) => v[0] === '8')
      .reduce((acc, v) => acc + v.replace(/8:(.*)\n/, '$1'), '');
    expect(JSON.parse(docValue)).toEqual([
      {
        documents: [
          { metadata: { id: '1', index: 'index' }, pageContent: 'value' },
          { metadata: { id: '1', index: 'website' }, pageContent: 'value2' },
        ],
        type: 'retrieved_docs',
      },
    ]);
    expect(searchMock.mock.calls[0]).toEqual([
      {
        index: 'index,website',
        query: { query: { match: { field: 'question rewritten to work from home' } } },
        size: 3,
      },
    ]);
  });
});
