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
    `You are a helpful cybersecurity (SIEM) expert agent. Your task is to translate "detection rules" from Splunk to Elastic Security.
You will be provided with a Splunk rule information: the title, description and the SPL (Search Processing Language) query.
Your goal is to translate the SPL query into an equivalent Elastic Security Query Language (ES|QL) query.

IMPORTANT: Always use the tools provided to translate the ES|QL query and summarize the translation, rather than making assumptions about how the ES|QL language works.

The output should contain:
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Translation Summary".
`,
  ],
  [
    'human',
    `Translate this Splunk rule into an Elastic ES|QL query rule:
<<SPLUNK_RULE_TITLE>>
{splunkRuleTitle}
<</SPLUNK_RULE_TITLE>>

<<SPLUNK_RULE_DESCRIPTION>>
{splunkRuleDescription}
<</SPLUNK_RULE_DESCRIPTION>>

<<SPLUNK_RULE_QUERY_SLP>>
{splunkRuleQuery}
<</SPLUNK_RULE_QUERY_SLP>>

`,
  ],
]);
