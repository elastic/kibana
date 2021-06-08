/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../typings/es_schemas/ui/fields/agent';

/*
 * Agent names can be any string. This list only defines the official agents
 * that we might want to target specifically eg. linking to their documentation
 * & telemetry reporting. Support additional agent types by appending
 * definitions in mappings.json (for telemetry), the AgentName type, and the
 * AGENT_NAMES array.
 */

export const OPEN_TELEMETRY_AGENT_NAMES: AgentName[] = [
  'otlp',
  'opentelemetry/cpp',
  'opentelemetry/dotnet',
  'opentelemetry/erlang',
  'opentelemetry/go',
  'opentelemetry/java',
  'opentelemetry/nodejs',
  'opentelemetry/php',
  'opentelemetry/python',
  'opentelemetry/ruby',
  'opentelemetry/webjs',
];

export const AGENT_NAMES: AgentName[] = [
  'dotnet',
  'go',
  'java',
  'js-base',
  'nodejs',
  'php',
  'python',
  'ruby',
  'rum-js',
  ...OPEN_TELEMETRY_AGENT_NAMES,
];

export const RUM_AGENT_NAMES: AgentName[] = [
  'js-base',
  'rum-js',
  'opentelemetry/webjs',
];

export function isJavaAgentName(
  agentName: string | undefined
): agentName is 'java' {
  return agentName === 'java';
}

export function isRumAgentName(
  agentName?: string
): agentName is 'js-base' | 'rum-js' | 'opentelemetry/webjs' {
  return RUM_AGENT_NAMES.includes(agentName! as AgentName);
}
