/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  BEDROCK_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  GEMINI_USER_PROMPT,
  STRUCTURED_SYSTEM_PROMPT,
} from './nodes/translations';

export const formatPrompt = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

export const systemPrompts = {
  openai: DEFAULT_SYSTEM_PROMPT,
  bedrock: `${DEFAULT_SYSTEM_PROMPT} ${BEDROCK_SYSTEM_PROMPT}`,
  // The default prompt overwhelms gemini, do not prepend
  gemini: GEMINI_SYSTEM_PROMPT,
  structuredChat: STRUCTURED_SYSTEM_PROMPT,
};

export const openAIFunctionAgentPrompt = formatPrompt(systemPrompts.openai);

export const bedrockToolCallingAgentPrompt = formatPrompt(systemPrompts.bedrock);

export const geminiToolCallingAgentPrompt = formatPrompt(systemPrompts.gemini);

export const formatPromptStructured = (prompt: string, additionalPrompt?: string) =>
  ChatPromptTemplate.fromMessages([
    ['system', additionalPrompt ? `${prompt}\n\n${additionalPrompt}` : prompt],
    ['placeholder', '{knowledge_history}'],
    ['placeholder', '{chat_history}'],
    [
      'human',
      '{input}\n\n{agent_scratchpad}\n\n(reminder to respond in a JSON blob no matter what)',
    ],
  ]);

export const structuredChatAgentPrompt = formatPromptStructured(systemPrompts.structuredChat);

/**
 * If Gemini is the llmType,
 * Adds a user prompt for the latest message in a conversation
 * @param prompt
 * @param llmType
 */
export const formatLatestUserMessage = (prompt: string, llmType?: string): string => {
  if (llmType === 'gemini') {
    return `${GEMINI_USER_PROMPT}${prompt}`;
  }
  return prompt;
};
