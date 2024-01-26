/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOpenTelemetryAgentName } from '../../../common/agent_name';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

const agentsDocPageName: Partial<Record<AgentName, string>> = {
  go: 'go',
  java: 'java',
  'js-base': 'rum-js',
  'iOS/swift': 'swift',
  'rum-js': 'rum-js',
  nodejs: 'nodejs',
  python: 'python',
  dotnet: 'dotnet',
  ruby: 'ruby',
  php: 'php',
  'opentelemetry/cpp': 'cpp',
  'opentelemetry/dotnet': 'net',
  'opentelemetry/erlang': 'erlang',
  'opentelemetry/go': 'go',
  'opentelemetry/java': 'java',
  'opentelemetry/nodejs': 'js',
  'opentelemetry/php': 'php',
  'opentelemetry/python': 'python',
  'opentelemetry/ruby': 'ruby',
  'opentelemetry/rust': 'rust',
  'opentelemetry/swift': 'swift',
  'opentelemetry/webjs': 'js',
};

export const getAgentDocsPageUrl = (agentName: AgentName) => {
  const agentDocsPageName = agentsDocPageName[agentName];

  if (!agentDocsPageName) {
    return undefined;
  }

  if (isOpenTelemetryAgentName(agentName)) {
    return `https://opentelemetry.io/docs/instrumentation/${agentDocsPageName}`;
  }

  return `https://www.elastic.co/guide/en/apm/agent/${agentDocsPageName}/current/`;
};
