/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../typings/es_schemas/ui/fields/agent';
import { ServerlessType } from './serverless';

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
  'android/java',
  ...OPEN_TELEMETRY_AGENT_NAMES,
];

export const isOpenTelemetryAgentName = (agentName: AgentName) =>
  OPEN_TELEMETRY_AGENT_NAMES.includes(agentName);

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

export function isMobileAgentName(agentName?: string) {
  return isIosAgentName(agentName) || isAndroidAgentName(agentName);
}

export function isIosAgentName(agentName?: string) {
  const lowercased = agentName && agentName.toLowerCase();
  return lowercased === 'ios/swift';
}

export function isJRubyAgent(agentName?: string, runtimeName?: string) {
  return agentName === 'ruby' && runtimeName?.toLowerCase() === 'jruby';
}

export function isServerlessAgent(serverlessType?: ServerlessType) {
  return (
    isAWSLambdaAgent(serverlessType) || isAzureFunctionsAgent(serverlessType)
  );
}

export function isAWSLambdaAgent(serverlessType?: ServerlessType) {
  return serverlessType === ServerlessType.AWS_LAMBDA;
}

export function isAzureFunctionsAgent(serverlessType?: ServerlessType) {
  return serverlessType === ServerlessType.AZURE_FUNCTIONS;
}

export function isAndroidAgentName(agentName?: string) {
  const lowercased = agentName && agentName.toLowerCase();
  return lowercased === 'android/java';
}
