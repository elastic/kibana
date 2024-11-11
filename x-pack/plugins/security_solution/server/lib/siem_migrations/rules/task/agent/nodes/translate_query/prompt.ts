/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationResources } from '../../../util/rule_resource_retriever';
import type { MigrateRuleState } from '../../types';

export const getEsqlTranslationPrompt = (state: MigrateRuleState, query: string): string => {
  return `You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate "detection rules" from Splunk to Elastic Security.
Your goal is to translate the SPL query into an equivalent Elastic Security Query Language (ES|QL) query.

Splunk rule Information provided:
- Below you will find Splunk rule information: the title (<<TITLE>>), the description (<<DESCRIPTION>>), and the SPL (Search Processing Language) query (<<SPL_QUERY>>).
- Use all the information to analyze the intent of the rule, in order to translate into an equivalent ES|QL rule.
- The fields in the Splunk query may not be the same as in the Elastic Common Schema (ECS), so you may need to map them accordingly.

Translation process hints:
- Analyze the SPL query and identify the key components.
- Translate the SPL query into an equivalent ES|QL query using ECS (Elastic Common Schema) field names.
- Always use logs* index pattern for the ES|QL translated query.

The output will be parsed and must contain:
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Migration Summary".

Find the Splunk rule information below:

<<TITLE>>
${state.original_rule.title}
<</TITLE>>

<<DESCRIPTION>>
${state.original_rule.description}
<</DESCRIPTION>>

<<SPL_QUERY>>
${query}
<</SPL_QUERY>>
`;
};

export const getInlineQueryPrompt = (
  state: MigrateRuleState,
  resources: RuleMigrationResources
): string => {
  const resourcesContext = [];
  if (resources.macro?.length) {
    const macrosSummary = resources.macro
      .map((macro) => `\`${macro.name}\`: ${macro.content}`)
      .join('\n');
    resourcesContext.push('<<MACROS>>', macrosSummary, '<</MACROS>>');
  }
  if (resources.list?.length) {
    const lookupsSummary = resources.list
      .map((list) => `lookup ${list.name}: ${list.content}`)
      .join('\n');
    resourcesContext.push('<<LOOKUP_TABLES>>', lookupsSummary, '<</LOOKUP_TABLES>>');
  }
  const resourcesStr = resourcesContext.join('\n');

  return `You are an agent expert in Splunk SPL (Search Processing Language). 
Your task is to inline a set of macros and lookup table values in a SPL query, and simplify it.

Guidelines:

- All the macros and lookup tables that are provided appear in the query. 
- You need to inline all those values in the query so they are not dependent on external resources.
- The result of the SPL query should be the same as the original query.
- If some macros or lookup tables are used in the query but their values are not provided, keep them in the query as they are.
- Finally, simplify the query as much as possible. Returning the same result with a simpler query is better.

Important: You must respond only with the modified query inside a \`\`\`spl code block, nothing else.

Find the macros and lookup tables below:

${resourcesStr}

Find the SPL query below:

\`\`\`spl
${state.original_rule.query}
\`\`\`

`;
};
