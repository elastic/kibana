/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type AgentName =
  | 'python'
  | 'java'
  | 'nodejs'
  | 'js-base'
  | 'rum-js'
  | 'ruby'
  | 'go';

export const agentNames: Set<AgentName> = new Set<AgentName>([
  'python',
  'java',
  'nodejs',
  'js-base',
  'rum-js',
  'ruby',
  'go'
]);

export const rumAgentNames: Set<AgentName> = new Set<AgentName>([
  'js-base',
  'rum-js'
]);

export function isAgentName(agentName: string): boolean {
  return agentNames.has(agentName as AgentName);
}

export function isRumAgentName(agentName: string): boolean {
  return rumAgentNames.has(agentName as AgentName);
}
