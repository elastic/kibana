/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationResources } from '../../../../../util/rule_resource_retriever';
import type { TranslateRuleState } from '../../types';

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
  state: TranslateRuleState,
  resources: RuleMigrationResources
): string => {
  const resourcesContext = getResourcesContext(resources);
  return `You are an agent expert in Splunk SPL (Search Processing Language).
Your task is to inline a set of macros and lookup tables syntax using their values in a SPL query.

# Guidelines
- You will be provided with a SPL query and also the resources reference with the values of macros and lookup tables.
- You have to replace the macros and lookup tables syntax in the SPL query and use their values inline, if provided.
- The original and modified queries must be equivalent.

# Process
- Go through the SPL query and identify all the macros and lookup tables that are used. Two scenarios may arise:
  - The macro or lookup table is provided in the resources: Replace it using its actual content.
  - The macro or lookup table is not provided in the resources: Do not replace it, keep it in the query as it is.

## Macros replacements

### Notes:
- Macros names have the number of arguments in parentheses, e.g., \`macroName(2)\`. You must replace the correct macro accounting for the number of arguments. 

### Example:
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

## Lookups replacements

### Notes:
- OUTPUTNEW and OUTPUT fields should be replaced with the values from the lookup table.
- Use the \`case\` function to evaluate conditions in the same order provided by the lookup table.
- Ensure all lookup matching fields are correctly matched to their respective case conditions.
- If there are more than one field to match, use the \`AND\` operator to combine them inside the \`case\` function.
- The transformed SPL query should function equivalently to the original query with the \`lookup\` command.

### Example:
  Having the following lookup table:
    uid,username,department
    1066,Claudia Garcia,Engineering
    1690,Rutherford Sullivan,Engineering
    1815,Vanya Patel,IT
    1862,Wei Zhang,Engineering
    1916,Alex Martin,Personnel
  And the following SPL query:
    \`\`\`spl
    ... | lookup users uid OUTPUTNEW username, department
    \`\`\`
  The correct replacement would be:
    \`\`\`spl
    ... | eval username=case(uid=1066, "Claudia Garcia",
                             uid=1690, "Rutherford Sullivan",
                             uid=1815, "Vanya Patel",
                             uid=1862, "Wei Zhang",
                             uid=1916, "Alex Martin",
                             true, null),
            department=case(uid=1066, "Engineering",
                            uid=1690, "Engineering",
                            uid=1815, "IT",
                            uid=1862, "Engineering",
                            uid=1916, "Personnel",
                            true, null)
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
