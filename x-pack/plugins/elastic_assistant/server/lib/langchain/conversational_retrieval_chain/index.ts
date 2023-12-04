/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { RunnableBranch, RunnableSequence } from 'langchain/runnables';
import type { VectorStoreRetriever } from 'langchain/vectorstores/base';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { BaseMessage } from 'langchain/schema';
import { Document } from 'langchain/document';
import { StringOutputParser } from 'langchain/schema/output_parser';

const CONDENSE_QUESTION_SYSTEM_TEMPLATE = `You are an experienced researcher, expert at interpreting and answering questions based on provided sources.
Your job is to remove references to chat history from incoming questions, rephrasing them as standalone questions.`;

const CONDENSE_QUESTION_HUMAN_TEMPLATE = `Using only previous conversation as context, rephrase the following question to be a standalone question.

Do not respond with anything other than a rephrased standalone question. Be concise, but complete and resolve all references to the chat history.

<question>
  {question}
</question>`;
const condenseQuestionPrompt = ChatPromptTemplate.fromMessages([
  ['system', CONDENSE_QUESTION_SYSTEM_TEMPLATE],
  new MessagesPlaceholder('chat_history'),
  ['human', CONDENSE_QUESTION_HUMAN_TEMPLATE],
]);

const ANSWER_SYSTEM_TEMPLATE = `You are an experienced researcher, expert at interpreting and answering questions based on provided sources.
Using the provided context, answer the user's question to the best of your ability using only the resources provided.
If there is no information in the context relevant to the question at hand, just say "Hmm, I'm not sure."
Anything between the following \`context\` html blocks is retrieved from a knowledge bank, not part of the conversation with the user.

<context>
  {context}
</context>`;

const ANSWER_HUMAN_TEMPLATE = `Answer the following question to the best of your ability:

{standalone_question}`;

const answerPrompt = ChatPromptTemplate.fromMessages([
  ['system', ANSWER_SYSTEM_TEMPLATE],
  new MessagesPlaceholder('chat_history'),
  ['human', ANSWER_HUMAN_TEMPLATE],
]);

const formatDocuments = (docs: Document[]) => {
  return docs
    .map((doc, i) => {
      return `<doc>\n${doc.pageContent}\n</doc>`;
    })
    .join('\n');
};

export function callConversationalRetrievalChain({
  model,
  retriever,
}: {
  model: BaseLanguageModel;
  retriever: VectorStoreRetriever;
}) {
  const retrievalChain = RunnableSequence.from([
    (input) => input.standalone_question,
    retriever,
    formatDocuments,
  ]).withConfig({ runName: 'RetrievalChain' });

  const standaloneQuestionChain = RunnableSequence.from([
    condenseQuestionPrompt,
    model,
    new StringOutputParser(),
  ]).withConfig({ runName: 'RephraseQuestionChain' });

  const answerChain = RunnableSequence.from([
    {
      standalone_question: (input) => input.standalone_question,
      chat_history: (input) => input.chat_history,
      context: retrievalChain,
    },
    answerPrompt,
    model,
  ]).withConfig({ runName: 'AnswerGenerationChain' });

  const conversationalRetrievalChain = RunnableSequence.from<{
    question: string;
    chat_history: BaseMessage[];
  }>([
    {
      // Small optimization - only rephrase if the question is a followup
      standalone_question: RunnableBranch.from([
        [(input) => input.chat_history.length > 0, standaloneQuestionChain],
        (input) => input.question,
      ]),
      chat_history: (input) => input.chat_history,
    },
    answerChain,
  ]);
  return conversationalRetrievalChain;
}
