/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import semver from 'semver';
import { Agent } from '../types';

export function isAgentUpgradeable(agent: Agent, kibanaVersion: string) {
  let agentVersion: string;
  if (typeof agent?.local_metadata?.elastic?.agent?.version === 'string') {
    agentVersion = agent.local_metadata.elastic.agent.version;
  } else {
    return false;
  }
  if (agent.unenrollment_started_at || agent.unenrolled_at) return false;
  const kibanaVersionParsed = semver.parse(kibanaVersion);
  const agentVersionParsed = semver.parse(agentVersion);
  if (!agentVersionParsed || !kibanaVersionParsed) return false;
  if (!agent.local_metadata.elastic.agent.upgradeable) return false;
  return semver.lt(agentVersionParsed, kibanaVersionParsed);
}
