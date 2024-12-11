/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
export const MATCH_INTEGRATION_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an expert assistant in Cybersecurity, your task is to help migrating a SIEM detection rule, from Splunk Security to Elastic Security.
You will be provided with a Splunk Detection Rule name by the user, your goal is to try to find the most relevant Elastic Integration from the integration list below if any, and return either the most relevant. If none seems relevant you should always return empty.
Here are some context for you to reference for your task, read it carefully as you will get questions about it later:

<context>
<elastic_integrations>
{integrations}
</elastic_integrations>
</context>
`,
  ],
  [
    'human',
    `See the below description of the relevant splunk rule and try to match it with any of the Elastic Integrations from before, do not guess or reply with anything else, only reply with the most relevant Elastic Integration if any.
<splunk_rule>
{splunk_rule}
</splunk_rule>

<guidelines>
- Always reply with a JSON object with the key "match" and the value being the most relevant matched integration title. Do not reply with anything else.
- Only reply with exact matches, if you are unsure or do not find a very confident match, always reply with an empty string value in the match key, do not guess or reply with anything else.
- If there is one elastic integration in the list that covers the relevant usecase, set the title of the matching integration as a value of the match key. Do not reply with anything else.
- If there are multiple elastic integrations in the list that cover the same usecase, answer with the most specific of them, for example if the rule is related to "Sysmon" then the Sysmon integration is more specific than Windows.
</guidelines>

<example_response>
U: <splunk_rule_name>
Linux Auditd Add User Account Type
</splunk_rule_name>
A: Please find the match JSON object below:
\`\`\`json
{{"match": "auditd_manager"}}
\`\`\`
</example_response>
`,
  ],
  ['ai', 'Please find the match JSON object below:'],
]);
