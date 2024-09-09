/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptTemplate } from '../output_executor';

/**
 * Prompt used to ask the LLM to improve a function or command page
 */
export const improveFunctionPrompt: PromptTemplate<{ content: string; documentation: string }> = ({
  content,
  documentation,
}) => {
  return {
    system: `
      You are a helpful assistant specialized in checking and improving technical documentation
      about ES|QL, the new Query language from Elasticsearch written in Markdown format.

      You will be provided a technical documentation article from the user. Please do the following:

      - If you think content of the  "Description" section can be improved or rewritten in a way that
        makes it more clear and explicit, please do so.
      - Add a very short (one sentence, only a few word) presentation of the function or command at the very
        top of the document, just below the main title. E.g. "The FOO function is used to [...]". Do NOT mention
        ES|QL in that description.
      - If any limitations impacting this function or command are mentioned in other documents, such
        as the "esql-limitations.html" file, please add a "Limitations" section at the bottom of the file
        and mention them. Otherwise, don't say or mention that there are no limitations.
      - If you think the provided list of examples don't cover all the functionality of the command or
        function described, please add some. However, DO NOT remove or edit in any way the existing examples.
      - DO NOT modify the main title of the page, it must only be the command name, e.g. "## AVG"
      - DO NOT anything that was not explicitly requested in your instructions

      Please answer exclusively with the content of the document, without any additional messages,
      information, though or reasoning. Do not quote the output with \`\`\`.

      The full documentation, in JSON format:
      \`\`\`json
      ${documentation}
      \`\`\`
      `,
    input: `
      This is the technical document page you need to improve:

      \`\`\`markdown
      ${content}
      \`\`\`
      `,
  };
};

/**
 * Prompt used to ask the LLM to improve a function or command page
 */
export const createPageInstructionPrompt: PromptTemplate<{
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
