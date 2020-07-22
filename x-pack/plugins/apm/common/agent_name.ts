/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentName } from '../typings/es_schemas/ui/fields/agent';

/*
 * Agent names can be any string. This list only defines the official agents
 * that we might want to target specifically eg. linking to their documentation
 * & telemetry reporting. Support additional agent types by appending
 * definitions in mappings.json (for telemetry), the AgentName type, and the
 * AGENT_NAMES array.
 */

export const AGENT_NAMES: AgentName[] = [
  'java',
  'js-base',
  'rum-js',
  'dotnet',
  'go',
  'java',
  'nodejs',
  'python',
  'ruby',
];

export function isAgentName(agentName: string): agentName is AgentName {
  return AGENT_NAMES.includes(agentName as AgentName);
}

export function isRumAgentName(
  agentName: string | undefined
): agentName is 'js-base' | 'rum-js' {
  return agentName === 'js-base' || agentName === 'rum-js';
}

export function isJavaAgentName(
  agentName: string | undefined
): agentName is 'java' {
  return agentName === 'java';
}
