/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptTemplate } from '../output_executor';

/**
 * Prompt used to ask the LLM to convert a raw html content to markdown.
 */
export const convertToMarkdownPrompt: PromptTemplate<{
  htmlContent: string;
}> = ({ htmlContent }) => {
  return {
    system: `
      You are a helpful assistant specialized
      in converting html fragment extracted from online documentation into equivalent Markdown documents.

      Please respond exclusively with the requested Markdown document, without
      adding your thoughts or any non-markdown reply.

      - Ignore all links (just use their text content when relevant)
      - Blockquotes (>) are not wanted, so don't generate any
      - Use title2 (##) for the main title of the document
      - Use title3 (###) for the section titles, such as "Syntax", "Parameters", "Examples" and so on.
      - Use title4 (####) for subsections, such as parameter names or example titles
      - HTML tables that are below code snippets are example of results. Please convert them to Markdown table
      - for <svg> elements, only keep the text content of the underlying <text> elements

      All the code snippets are for ESQL, so please use the following format for all snippets:

      \`\`\`esql
      <code example>
      \`\`\`

      `,
    input: `
      Here is the html documentation to convert to markdown:
      \`\`\`html
      ${htmlContent}
      \`\`\`
      `,
  };
};
