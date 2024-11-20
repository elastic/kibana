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
The list of Elastic Detection Rules suggested is provided in the context below.

Guidelines:
If there is no Elastic rule in the list that covers the same threat, answer only with the string: no_match
If there is one Elastic rule in the list that covers the same threat, answer only with its name without any further explanation.
If there are multiple rules in the list that cover the same threat, answer with the most specific of them, for example: "Linux User Account Creation" is more specific than "User Account Creation".

<ELASTIC_DETECTION_RULE_NAMES>
{elasticSecurityRules}
</ELASTIC_DETECTION_RULE_NAMES>
`,
  ],
  [
    'human',
    `The Splunk Detection Rule is:
<<SPLUNK_RULE_TITLE>>
{ruleTitle}
<<SPLUNK_RULE_TITLE>>
`,
  ],
  ['ai', 'Please find the answer below:'],
]);
