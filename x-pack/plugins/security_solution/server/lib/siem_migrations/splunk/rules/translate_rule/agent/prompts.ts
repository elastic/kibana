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
    `You are a helpful cybersecurity (SIEM) expert. Your task is to translate "detection rules" from Splunk to Elastic Security.
You will be provided with a Splunk rule information: the title, description and the SPL (Search Processing Language) query.
You will also be provided with the tools necessary to translate the ES|QL query and summarize the translation, do not make assumptions about the ES|QL queries.

The output should be an ES|QL query that is equivalent to the provided Splunk SPL query and a markdown summary of the translation process followed.
`,
  ],
  [
    'human',
    `Translate this Splunk rule into an ES|QL query:
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
