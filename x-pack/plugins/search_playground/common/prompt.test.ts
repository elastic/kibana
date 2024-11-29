/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Prompt } from './prompt';

describe('Prompt function', () => {
  it('should return a prompt in OpenAI format', () => {
    const instructions = 'Provide an explanation of the process.';
    const prompt = Prompt(instructions, {
      type: 'openai',
      citations: true,
      context: true,
    });

    expect(prompt).toMatchInlineSnapshot(`
      "
        Instructions:
        
        - Provide an explanation of the process.
        - Answer questions truthfully and factually using only the context presented.
        - If you don't know the answer, just say that you don't know, don't make up an answer.
        - You must always cite the document where the answer was extracted using inline academic citation style [], using the position.
        - Use markdown format for code examples.
        - You are correct, factual, precise, and reliable.
        

        Context:
        {context}

        
        "
    `);
  });

  it('should return a prompt in Mistral format', () => {
    const instructions = 'Explain the significance of the findings.';
    const prompt = Prompt(instructions, { type: 'mistral', citations: false, context: true });

    expect(prompt).toMatchInlineSnapshot(`
      "
        <s>[INST]
        - Explain the significance of the findings.
        - Answer questions truthfully and factually using only the context presented.
        - If you don't know the answer, just say that you don't know, don't make up an answer.
        
        - Use markdown format for code examples.
        - You are correct, factual, precise, and reliable.
        [/INST] </s>

        [INST]
        Context:
        {context}
        [/INST]

        

        "
    `);
  });

  it('should return a prompt in Anthropic format', () => {
    const instructions = 'Summarize the key points of the article.';
    const prompt = Prompt(instructions, { type: 'anthropic', citations: false, context: false });

    expect(prompt).toMatchInlineSnapshot(`
      "
        <instructions>
        - Summarize the key points of the article.
        
        - If you don't know the answer, just say that you don't know, don't make up an answer.
        
        - Use markdown format for code examples.
        - You are correct, factual, precise, and reliable.
        </instructions>

        <context>
        {context}
        </context>

        
        "
    `);
  });
});
