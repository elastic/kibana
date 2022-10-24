/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '@kbn/apm-plugin/typings/es_schemas/ui/fields/agent';
import fetch from 'node-fetch';
import { getAgentRepositoryDetails } from '../get_agent_url_repository';

const getAgentReleasesApiUrl = (
  agentName: AgentName,
) => {
  const repositoryDetails = getAgentRepositoryDetails(agentName);

  return repositoryDetails
    ? `https://api.github.com/repos/${repositoryDetails.user}/${repositoryDetails?.repository}/releases`
    : undefined;
};

export const fetchAgentLatestReleaseVersion = async (agent: AgentName) => {
  const url = getAgentReleasesApiUrl(agent);

  if (!url) {
    return;
  }

  const response = await fetch(url);

  const releases = await response.json();
  const latestVersion = releases[0]?.tag_name.replace('v', '');

  return {
    [agent]: latestVersion
  };
}
