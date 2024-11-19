/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationResources } from '../../../../util/rule_resource_retriever';
import type { MigrateRuleState } from '../../../types';

const getResourcesContext = (resources: RuleMigrationResources): string => {
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
  return resourcesContext.join('\n');
};

export const getReplaceQueryResourcesPrompt = (
  state: MigrateRuleState,
  resources: RuleMigrationResources
): string => {
  const resourcesContext = getResourcesContext(resources);
  return `You are an agent expert in Splunk SPL (Search Processing Language).
Your task is to inline a set of macros and lookup table values in a SPL query.

## Guidelines:

- You will be provided with a SPL query and also the resources reference with the values of macros and lookup tables.
- You have to replace the macros and lookup tables in the SPL query with their actual values. 
- The original and modified queries must be equivalent.
- Macros names have the number of arguments in parentheses, e.g., \`macroName(2)\`. You must replace the correct macro accounting for the number of arguments. 

## Process:

- Go through the SPL query and identify all the macros and lookup tables that are used. Two scenarios may arise:
  - The macro or lookup table is provided in the resources: Replace the call by their actual value in the query.
  - The macro or lookup table is not provided in the resources: Keep the call in the query as it is.

## Example:
    Having the following macros:
      \`someSource\`: sourcetype="somesource"
      \`searchTitle(1)\`: search title="$value$"
      \`searchTitle\`: search title=*
      \`searchType\`: search type=*
    And the following SPL query:
      \`\`\`spl
      \`someSource\` \`someFilter\`
      | \`searchTitle("sometitle")\`
      | \`searchType("sometype")\`
      | table *
      \`\`\`
    The correct replacement would be:
      \`\`\`spl
      sourcetype="somesource" \`someFilter\`
      | search title="sometitle"
      | \`searchType("sometype")\`
      | table *
      \`\`\`

## Important: You must respond only with the modified query inside a \`\`\`spl code block, nothing else.

# Find the macros and lookup tables below:

${resourcesContext}

# Find the SPL query below:

\`\`\`spl
${state.original_rule.query}
\`\`\`

`;
};
