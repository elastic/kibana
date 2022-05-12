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
  'opentelemetry/swift',
  'opentelemetry/webjs',
];

export const AGENT_NAMES: AgentName[] = [
  'dotnet',
  'go',
  'iOS/swift',
  'java',
  'js-base',
  'nodejs',
  'php',
  'python',
  'ruby',
  'rum-js',
  ...OPEN_TELEMETRY_AGENT_NAMES,
];

export const JAVA_AGENT_NAMES: AgentName[] = ['java', 'opentelemetry/java'];

export function isJavaAgentName(
  agentName?: string
): agentName is 'java' | 'opentelemetry/java' {
  return JAVA_AGENT_NAMES.includes(agentName! as AgentName);
}

export const RUM_AGENT_NAMES: AgentName[] = [
  'js-base',
  'rum-js',
  'opentelemetry/webjs',
];

export function isRumAgentName(
  agentName?: string
): agentName is 'js-base' | 'rum-js' | 'opentelemetry/webjs' {
  return RUM_AGENT_NAMES.includes(agentName! as AgentName);
}

export function normalizeAgentName<T extends string | undefined>(
  agentName: T
): T | string {
  if (isRumAgentName(agentName)) {
    return 'rum-js';
  }

  if (isJavaAgentName(agentName)) {
    return 'java';
  }

  if (isIosAgentName(agentName)) {
    return 'ios';
  }

  return agentName;
}

export function isIosAgentName(agentName?: string) {
  const lowercased = agentName && agentName.toLowerCase();
  return lowercased === 'ios/swift' || lowercased === 'opentelemetry/swift';
}

export function isJRubyAgent(agentName?: string, runtimeName?: string) {
  return agentName === 'ruby' && runtimeName?.toLowerCase() === 'jruby';
}

export function isServerlessAgent(runtimeName?: string) {
  return runtimeName?.toLowerCase().startsWith('aws_lambda');
}
