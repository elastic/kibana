/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Document } from '@langchain/core/documents';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { Runnable, RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import { BytesOutputParser, StringOutputParser } from '@langchain/core/output_parsers';
import {
  createStreamDataTransformer,
  experimental_StreamData,
  Message as VercelChatMessage,
} from 'ai';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { BaseMessage } from '@langchain/core/messages';
import { ElasticsearchRetriever } from './elasticsearch_retriever';
import { renderTemplate } from '../utils/render_template';

import { AssistClient } from '../utils/assist';
import { getCitations } from '../utils/get_citations';
import { getTokenEstimate, getTokenEstimateFromMessages } from './token_tracking';

interface RAGOptions {
  index: string;
  retriever: (question: string) => object;
  doc_context?: string;
  hit_doc_mapper?: (hit: SearchHit) => Document;
  content_field: string | Record<string, string>;
  size?: number;
}

interface ConversationalChainOptions {
  model: BaseLanguageModel;
  prompt: string;
  rag?: RAGOptions;
}

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language. Be verbose in your answer.

Chat History:
{chat_history}

Follow Up Input: {question}
Standalone question:`;

const condenseQuestionPrompt = PromptTemplate.fromTemplate(CONDENSE_QUESTION_TEMPLATE);

const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === 'user') {
      return `Human: ${message.content}`;
    } else if (message.role === 'assistant') {
      return `Assistant: ${message.content}`;
    } else {
      return `${message.role}: ${message.content}`;
    }
  });
  return formattedDialogueTurns.join('\n');
};

const buildContext = (docs: Document[]) => {
  const serializedDocs = docs.map((doc, i) =>
    renderTemplate(
      `
position: ${i + 1}
{pageContent}`,
      {
        pageContent: doc.pageContent,
        ...doc.metadata,
      }
    )
  );
  return serializedDocs.join('\n');
};

class ConversationalChainFn {
  options: ConversationalChainOptions;

  constructor(options: ConversationalChainOptions) {
    this.options = options;
  }

  async stream(client: AssistClient, msgs: VercelChatMessage[]) {
    const data = new experimental_StreamData();

    const messages = msgs ?? [];
    const previousMessages = messages.slice(0, -1);
    const question = messages[messages.length - 1]!.content;
    const retrievedDocs: Document[] = [];

    let retrievalChain: Runnable = RunnableLambda.from(() => '');

    if (this.options.rag) {
      const retriever = new ElasticsearchRetriever({
        retriever: this.options.rag.retriever,
        index: this.options.rag.index,
        client: client.getClient(),
        content_field: this.options.rag.content_field,
        hit_doc_mapper: this.options.rag.hit_doc_mapper ?? undefined,
        k: this.options.rag.size ?? 3,
      });

      retrievalChain = retriever.pipe(buildContext);
    }

    let standaloneQuestionChain: Runnable = RunnableLambda.from((input) => input.question);

    if (previousMessages.length > 0) {
      standaloneQuestionChain = RunnableSequence.from([
        condenseQuestionPrompt,
        this.options.model,
        new StringOutputParser(),
      ]).withConfig({
        metadata: {
          type: 'standalone_question',
        },
      });
    }

    const prompt = ChatPromptTemplate.fromTemplate(this.options.prompt);

    const answerChain = RunnableSequence.from([
      {
        context: RunnableSequence.from([(input) => input.question, retrievalChain]),
        chat_history: (input) => input.chat_history,
        question: (input) => input.question,
      },
      prompt,
      this.options.model,
    ]);

    const conversationalRetrievalQAChain = RunnableSequence.from([
      {
        question: standaloneQuestionChain,
        chat_history: (input) => input.chat_history,
      },
      answerChain,
      new BytesOutputParser(),
    ]).withConfig({
      metadata: {
        type: 'conversational_retrieval_qa',
      },
    });

    const stream = await conversationalRetrievalQAChain.stream(
      {
        question,
        chat_history: formatVercelMessages(previousMessages),
      },
      {
        callbacks: [
          {
            handleChatModelStart(
              llm,
              msg: BaseMessage[][],
              runId,
              parentRunId,
              extraParams,
              tags,
              metadata: Record<string, string>
            ) {
              if (metadata?.type === 'conversational_retrieval_qa') {
                data.appendMessageAnnotation({
                  type: 'prompt_token_count',
                  count: getTokenEstimateFromMessages(msg),
                });
              }
            },
            handleRetrieverEnd(documents) {
              retrievedDocs.push(...documents);
              data.appendMessageAnnotation({
                type: 'retrieved_docs',
                documents: documents as any,
              });
              data.appendMessageAnnotation({
                type: 'context_token_count',
                count: getTokenEstimate(buildContext(documents)),
              });
            },
            handleChainEnd(outputs, runId, parentRunId) {
              if (outputs?.constructor?.name === 'AIMessageChunk') {
                data.appendMessageAnnotation({
                  type: 'citations',
                  documents: getCitations(
                    outputs.content as string,
                    'inline',
                    retrievedDocs
                  ) as any,
                });
              }

              // check that main chain (without parent) is finished:
              if (parentRunId == null) {
                data.close().catch(() => {});
              }
            },
          },
        ],
      }
    );

    return stream.pipeThrough(createStreamDataTransformer(true)).pipeThrough(data.stream);
  }
}

export function ConversationalChain(options: ConversationalChainOptions): ConversationalChainFn {
  return new ConversationalChainFn(options);
}
