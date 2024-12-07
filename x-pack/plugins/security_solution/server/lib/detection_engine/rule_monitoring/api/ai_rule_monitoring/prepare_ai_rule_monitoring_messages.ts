/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiMessage } from './invoke_ai';

export function prepareAiRuleMonitoringMessages(ruleMonitoringStats: string): AiMessage[] {
  return [
    {
      role: 'system',
      content: SET_UP_SYSTEM_PROMPT,
    },
    {
      role: 'system',
      content: SYSTEM_INVESTIGATION_GUIDE,
    },
    {
      role: 'user',
      content: ruleMonitoringStats,
    },
    {
      role: 'user',
      content: GOAL,
    },
  ];
}

const SET_UP_SYSTEM_PROMPT =
  'You are an analytic assistant. You are given Kibana security rules monitoring data in yaml format.';

const SYSTEM_INVESTIGATION_GUIDE = [
  'See if there is anything suspicious in the collected data',
  'Check how many rules there are in the whole cluster and in every space',
  'Check how many enabled rules there are in total and in every space. Could it be too many for the size of the cluster?',
  'Check how many rules of types known to be problematic there are, e.g. Indicator Match, EQL',
  'Check if there are any slow rules by total execution or search duration, e.g. 10 seconds and higher',
  'Check if there are rules with a high schedule delay, e.g. more than 6 seconds (normal values should be under 3-5 seconds)',
  'Check if there are/were any failing or partially failing rules',
  'Check if there were any gaps detected',
  'Check for any other anomalies or suspicious numbers',
  'For the suspicious rules you found check their parameters in the files created at the get all rules step',
  'NOTE: It is very difficult to give any concrete values for what could be "too many rules", or "too high total execution duration", or how many enabled rules Kibana/ES can handle, or anything like that. It can be very "it depends" on many factors, such as horizontal and vertical cluster size, size of the source data, data tiers, ingest volumes, number of indices, number of mapped fields, complexity of rules and queries in them, etc. One user can have 1000 performant rules and no issues, another user can have only 100 rules with 3 very heavy rules and thus having some issues',
].join('. ');

const GOAL = [
  'Spot potential problems in the cluster',
  'Analyze if it happened once or a constant problem',
  'Give advices to improve the situation',
  'Enumerate top 5 problematic rules with their summary metrics',
  'Enumerate top errors and warnings',
].join('. ');
