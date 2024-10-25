/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MigrateRuleState } from './types';

export const getEsqlTranslationPrompt = (
  state: MigrateRuleState
): string => `You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate "detection rules" from Splunk to Elastic Security.
Below you will find Splunk rule information: the title, description and the SPL (Search Processing Language) query.
Your goal is to translate the SPL query into an equivalent Elastic Security Query Language (ES|QL) query.

The output will be parsed and should contain:
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Migration Summary".

This is the Splunk rule information:

<<SPLUNK_RULE_TITLE>>
${state.original_rule.title}
<</SPLUNK_RULE_TITLE>>

<<SPLUNK_RULE_DESCRIPTION>>
${state.original_rule.description}
<</SPLUNK_RULE_DESCRIPTION>>

<<SPLUNK_RULE_QUERY_SLP>>
${state.original_rule.query}
<</SPLUNK_RULE_QUERY_SLP>>
`;
