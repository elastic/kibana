/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName, isElasticAgentName } from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent';
import fetch from 'node-fetch';

export const agentsRepoName: Record<AgentName, string | undefined> = {
  'go': 'apm-agent-go',
  'java': 'apm-agent-java',
  'js-base': 'apm-agent-rum-js',
  'iOS/swift': 'apm-agent-ios',
  'rum-js': 'apm-agent-rum-js',
  'nodejs': 'apm-agent-nodejs',
  'python': 'apm-agent-python',
  'dotnet': 'apm-agent-dotnet',
  'ruby': 'apm-agent-ruby',
  'php': 'apm-agent-php',
  'android/java': 'apm-agent-android',
  'otlp': undefined,
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
  Object.entries(agentsRepoName).map(([agent, _]) => agent as AgentName);

const getAgentReleasesApiUrl = (
  agentName: AgentName,
) => {
  const user = isElasticAgentName(agentName) ? 'elastic': 'open-telemetry';
  const agentRepo = agentsRepoName[agentName];

  if (!agentRepo) {
    return undefined;
  }

  return `https://api.github.com/repos/${user}/${agentRepo}/releases`;
};

export const fetchAgentLatestReleaseVersion = async (agent: AgentName) => {
  const url = getAgentReleasesApiUrl(agent);

  if (!url) {
    return;
  }

  const response = await fetch(url);

  const releases = await response.json();
  const latestVersion = releases[0]?.tag_name.replace('v', '');

  console.log(response.headers.get("X-RateLimit-Remaining"));

  return {
    [agent]: latestVersion
  };
}
