/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const TRANSLATE_RULE_MAIN_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a helpful assistant for translating queries from SPL (Splunk Search Processing Language) to Elastic ES|QL queries.
Your goal is to construct the equivalent ES|QL query given a SPL query.

VERY IMPORTANT: Use the provided tools to construct and validate the ES|QL query, do not make assumptions about the ES|QL queries.

The final response should be the ES|QL query inside a esql code block like:
\`\`\`esql
<the query goes here>
\`\`\`
`,
  ],
  [
    'human',
    `The SPL query is:
\`\`\`spl
{splunkRuleQuery}
\`\`\`
`,
  ],
]);
