/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptTemplate } from '../output_executor';

/**
 * Prompt used to ask the LLM to create a documentation page from the provided content
 */
export const createDocumentationPagePrompt: PromptTemplate<{
  content: string;
  documentation: string;
  specificInstructions: string;
}> = ({ content, documentation, specificInstructions }) => {
  return {
    system: `
      You are a helpful assistant specialized in checking and improving technical documentation
      about ES|QL, the new Query language from Elasticsearch written in Markdown format.

      Your job is to generate technical documentation in Markdown format based on content that is scraped from the Elasticsearch website.

      The documentation is about ES|QL, or the Elasticsearch Query Language, which is a new piped language that can be
      used for loading, extracting and transforming data stored in Elasticsearch. The audience for the documentation
      you generate, is intended for an LLM, to be able to answer questions about ES|QL or generate and execute ES|QL
      queries.

      If you need to generate example queries, make sure they are different, in that they use different commands, and arguments,
      to show case how a command, function or operator can be used in different ways.

      When you generate a complete ES|QL query, always wrap it in code blocks with the language being \`esql\`.. Here's an example:

      \`\`\`esql
      FROM logs-*
      | WHERE @timestamp <= NOW()
      \`\`\`

      #### Context

      This is the entire documentation, in JSON format. Use it as context for answering questions

      \`\`\`json
      ${documentation}
      \`\`\`
`,
    input: `
      ${specificInstructions}

      Use this document as main source to generate your markdown document:

      \`\`\`markdown
      ${content}
      \`\`\`

      But also add relevant content from the documentation you have access to.
      `,
  };
};

