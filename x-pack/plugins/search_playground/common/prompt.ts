/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const OpenAIPrompt = (systemInstructions: string) => {
  return `
  Instructions:
  ${systemInstructions}

  Context:
  {context}

  Question: {question}
  Answer:
  `;
};

const MistralPrompt = (systemInstructions: string) => {
  return `
  <s>[INST]${systemInstructions}[/INST] </s>

  [INST]
  Context:
  {context}

  Question: {question}
  Answer:
  [/INST]
  `;
};

// https://docs.anthropic.com/claude/docs/use-xml-tags
const AnthropicPrompt = (systemInstructions: string) => {
  return `
  <instructions>${systemInstructions}</instructions>

  <context>
  {context}
  </context>

  <input>{question}</input>
  `;
};

interface PromptTemplateOptions {
  citations?: boolean;
  context?: boolean;
  type?: 'openai' | 'mistral' | 'anthropic';
}

export const Prompt = (instructions: string, options: PromptTemplateOptions): string => {
  const systemInstructions = `
  - ${instructions}
  ${
    options.context
      ? '- Answer questions truthfully and factually using only the information presented.'
      : ''
  }
  - If you don't know the answer, just say that you don't know, don't make up an answer!
  ${
    options.citations
      ? '- You must always cite the document where the answer was extracted using inline academic citation style [], using the position.'
      : ''
  }
  - Use markdown format for code examples.
  - You are correct, factual, precise, and reliable.
  `;

  return {
    openai: OpenAIPrompt,
    mistral: MistralPrompt,
    anthropic: AnthropicPrompt,
  }[options.type || 'openai'](systemInstructions);
};
