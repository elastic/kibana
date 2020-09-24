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
  'dotnet',
  'go',
  'java',
  'js-base',
  'nodejs',
  'python',
  'ruby',
  'rum-js',
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

export const RUM_AGENTS = ['js-base', 'rum-js'];

export function isRumAgentName(
  agentName?: string
): agentName is 'js-base' | 'rum-js' {
  return RUM_AGENTS.includes(agentName!);
}

export function isJavaAgentName(
  agentName: string | undefined
): agentName is 'java' {
  return agentName === 'java';
}

/**
 * "Normalizes" and agent name by:
 *
 * * Converting to lowercase
 * * Converting "rum-js" to "js-base"
 * * Converting OpenTelemetry agent names to "our" agent names
 *
 * This helps dealing with some older agent versions
 */
export function getNormalizedAgentName(agentName?: string) {
  let newName = agentName && agentName.toLowerCase();

  if (isRumAgentName(newName) || newName === 'opentelemetry/webjs') {
    newName = 'js-base';
  }

  if (newName?.startsWith('opentelemetry/')) {
    newName = newName?.replace('opentelemetry/', '');
  }

  // OpenTelemetry implementations that do not report their agent name can be
  // reported as "otlp"
  //
  // OpenTelemetry alse supports Erlang and C++ but we don't so just use the
  // OpenTelemetry icon for those.
  if (newName === 'cpp' || newName === 'erlang' || newName === 'otlp') {
    newName = 'opentelemetry/unknown';
  }

  return newName;
}
