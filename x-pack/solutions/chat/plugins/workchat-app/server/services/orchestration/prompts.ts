/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';

const getSystemPrompt = (agentPrompt: string) => {
  return `You are a helpful chat assistant from the Elasticsearch company.

  You have tools at your disposal that you can use to answer the user's question.
  E.g. when available and relevant, use the search docs tool to search the knowledge base for relevant documents.

  ### Specific agent instructions

  ${agentPrompt}

  ### Additional info
  - The current date is: ${new Date().toISOString()}
  - You can use markdown format to structure your response
  `;
};

export const withSystemPrompt = async ({
  agentPrompt,
  messages,
}: {
  agentPrompt: string;
  messages: BaseMessage[];
}) => {
  return await ChatPromptTemplate.fromMessages([
    ['system', getSystemPrompt(agentPrompt)],
    ['placeholder', '{messages}'],
  ]).invoke({ messages });
};
