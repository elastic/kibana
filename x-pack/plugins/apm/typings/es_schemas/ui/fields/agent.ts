/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ElasticAgentName =
  | 'go'
  | 'java'
  | 'js-base'
  | 'iOS/swift'
  | 'rum-js'
  | 'nodejs'
  | 'python'
  | 'dotnet'
  | 'ruby'
  | 'php';

export type OpenTelemetryAgentName =
  | 'otlp'
  | 'opentelemetry/cpp'
  | 'opentelemetry/dotnet'
  | 'opentelemetry/erlang'
  | 'opentelemetry/go'
  | 'opentelemetry/java'
  | 'opentelemetry/nodejs'
  | 'opentelemetry/php'
  | 'opentelemetry/python'
  | 'opentelemetry/ruby'
  | 'opentelemetry/swift'
  | 'opentelemetry/webjs';

/*
 * Support additional agent types by appending definitions in mappings.json
 * (for telemetry) and the AgentName type.
 */
export type AgentName = ElasticAgentName | OpenTelemetryAgentName;

export interface Agent {
  ephemeral_id?: string;
  name: AgentName;
  version: string;
}
