/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentName,
  isElasticAgentName,
} from '../../../typings/es_schemas/ui/fields/agent';

const agentsRepoName: Partial<Record<AgentName, string>> = {
  go: 'apm-agent-go',
  java: 'apm-agent-java',
  'js-base': 'apm-agent-rum-js',
  'iOS/swift': 'apm-agent-ios',
  'rum-js': 'apm-agent-rum-js',
  nodejs: 'apm-agent-nodejs',
  python: 'apm-agent-python',
  dotnet: 'apm-agent-dotnet',
  ruby: 'apm-agent-ruby',
  php: 'apm-agent-php',
  'android/java': 'apm-agent-android',
  'opentelemetry/cpp': 'opentelemetry-cpp',
  'opentelemetry/dotnet': 'opentelemetry-dotnet',
  'opentelemetry/erlang': 'opentelemetry-erlang',
  'opentelemetry/go': 'opentelemetry-go',
  'opentelemetry/java': 'opentelemetry-java',
  'opentelemetry/nodejs': 'opentelemetry-js',
  'opentelemetry/php': 'opentelemetry-php',
  'opentelemetry/python': 'opentelemetry-python',
  'opentelemetry/ruby': 'opentelemetry-ruby',
  'opentelemetry/swift': 'opentelemetry-swift',
  'opentelemetry/webjs': 'opentelemetry-js',
};

export const getAllAgentsName = () =>
  Object.keys(agentsRepoName).map((agent) => agent as AgentName);

export const getAgentRepositoryDetails = (agentName: AgentName) => {
  const user = isElasticAgentName(agentName) ? 'elastic' : 'open-telemetry';
  const repository = agentsRepoName[agentName];

  if (!repository) {
    return undefined;
  }

  return { user, repository };
};

export const getAgentRepositoryUrl = (agentName: AgentName) => {
  const repositoryDetails = getAgentRepositoryDetails(agentName);

  return repositoryDetails
    ? `https://github.com/${repositoryDetails.user}/${repositoryDetails.repository}`
    : undefined;
};
