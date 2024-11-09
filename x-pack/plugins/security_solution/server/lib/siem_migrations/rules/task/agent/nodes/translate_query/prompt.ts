/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationResources } from '../../../util/rule_resource_retriever';
import type { MigrateRuleState } from '../../types';

export const getEsqlTranslationPrompt = (
  state: MigrateRuleState,
  resources: RuleMigrationResources
): string => {
  const resourcesPrompt = getResourcesPrompt(resources);
  return `You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate "detection rules" from Splunk to Elastic Security.
Below you will find Splunk rule information: the title, description and the SPL (Search Processing Language) query. Along with related resources, such as lookup lists and macros.
Your goal is to translate the SPL query into an equivalent Elastic Security Query Language (ES|QL) query.

Guidelines:
- Start the translation process by analyzing the SPL query and identifying the key components.
- Always use logs* index pattern for the ES|QL translated query.
- If, in the SPL query, you find a lookup list or macro that, based only on its name, you can not translate with confidence to ES|QL, mention it in the summary and
add a placeholder in the query with the format [macro:<macro_name>(parameters)] or [lookup:<lookup_name>] including the [] keys, example: [macro:my_macro(first_param,second_param)] or [lookup:my_lookup].

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

${resourcesPrompt}
`;
};

const getResourcesPrompt = (resources: RuleMigrationResources): string => {
  const resourcesList = Object.entries(resources).map(([type, values]) => {
    const summaries = values.map((value) => `* ${value.name}: ${value.content}`).join('\n');
    return `${type}s:\n${summaries}`;
  });

  if (resourcesList.length === 0) {
    return '';
  }

  return `<<RESOURCES>>
${resourcesList.join('\n')}
<</RESOURCES>>`;
};
