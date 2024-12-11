/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

export const ESQL_TRANSLATION_PROMPT =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent. Your task is to migrate "detection rules" from Splunk to Elastic Security.
Your goal is to translate the SPL query into an equivalent Elastic Security Query Language (ES|QL) query.
Below is the relevant context used when deciding which Elastic Common Schema field to use when translating from Splunk CIM fields:

<context>
<cim_to_ecs_map>
{field_mapping}
</cim_to_ecs_map>
</context>

## Splunk rule Information provided:
- Below you will find Splunk rule information: the title (<<TITLE>>), the description (<<DESCRIPTION>>), and the SPL (Search Processing Language) query (<<SPL_QUERY>>).
- Use all the information to analyze the intent of the rule, in order to translate into an equivalent ES|QL rule.
- The fields in the Splunk query may not be the same as in the Elastic Common Schema (ECS), so you may need to map them accordingly.

## Guidelines:
- Analyze the SPL query and identify the key components.
- Translate the SPL query into an equivalent ES|QL query using ECS (Elastic Common Schema) field names.
- Always start the generated ES|QL query by filtering FROM using these index patterns in the translated query: {indexPatterns}.
- If, in the SPL query, you find a lookup list or macro call, mention it in the summary and add a placeholder in the query with the format [macro:<macro_name>(argumentCount)] or [lookup:<lookup_name>] including the [] keys, 
  - Examples: 
    - \`get_duration(firstDate,secondDate)\` -> [macro:get_duration(2)]
    - lookup dns_domains.csv -> [lookup:dns_domains.csv].

## The output will be parsed and must contain:
- First, the ES|QL query inside an \`\`\`esql code block.
- At the end, the summary of the translation process followed in markdown, starting with "## Migration Summary".

Find the Splunk rule information below:

<<TITLE>>
{title}
<</TITLE>>

<<DESCRIPTION>>
{description}
<</DESCRIPTION>>

<<SPL_QUERY>>
{inline_query}
<</SPL_QUERY>>
`);
