/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const MATCH_PREBUILT_RULE_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert assistant in Cybersecurity, your task is to help migrating a SIEM detection rule, from Splunk Security to Elastic Security.
You will be provided with a Splunk Detection Rule name by the user, your goal is to try find an Elastic Detection Rule that covers the same threat, if any.
Here are some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<elastic_detection_rule_names>
{elasticSecurityRules}
</elastic_detection_rule_names>
</context>
`,
  ],
  [
    'human',
    `See the below description of the relevant splunk rule and try to match it with any of the elastic detection rules with similar names.     
<splunk_rule_name>
{ruleTitle}
</splunk_rule_name>

<guidelines>
- Always reply with a JSON object with the key "match" and the value being the most relevant matched elastic detection rule name. Do not reply with anything else.
- Only reply with exact matches, if you are unsure or do not find a very confident match, always reply with an empty string value in the match key, do not guess or reply with anything else.
- If there is one Elastic rule in the list that covers the same threat, set the name of the matching rule as a value of the match key. Do not reply with anything else.
- If there are multiple rules in the list that cover the same threat, answer with the most specific of them, for example: "Linux User Account Creation" is more specific than "User Account Creation".
</guidelines>

<example_response>
U: <splunk_rule_name>
Linux Auditd Add User Account Type
</splunk_rule_name>
A: Please find the match JSON object below:
\`\`\`json
{{"match": "Linux User Account Creation"}}
\`\`\`
</example_response>
`,
  ],
  ['ai', 'Please find the match JSON object below:'],
]);
