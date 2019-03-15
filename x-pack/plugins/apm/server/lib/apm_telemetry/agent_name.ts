/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Agent names can be any string. This list only defines the official agents
 * that we might want to target specifically eg. linking to their documentation
 * & telemetry reporting. Support additional agent types by appending
 * definitions in mappings.json (for telemetry), the AgentName type, and the
 * agentNames Set.
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
