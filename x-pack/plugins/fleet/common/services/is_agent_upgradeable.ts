/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import { Agent } from '../types';

export function isAgentUpgradeable(agent: Agent, kibanaVersion: string) {
  let agentVersion: string;
  if (typeof agent?.local_metadata?.elastic?.agent?.version === 'string') {
    agentVersion = agent.local_metadata.elastic.agent.version;
  } else {
    return false;
  }
  if (agent.unenrollment_started_at || agent.unenrolled_at) return false;
  if (!agent.local_metadata.elastic.agent.upgradeable) return false;

  // make sure versions are only the number before comparison
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error('agent version is invalid');
  const kibanaVersionNumber = semverCoerce(kibanaVersion);
  if (!kibanaVersionNumber) throw new Error('kibana version is invalid');
  return semverLt(agentVersionNumber, kibanaVersionNumber);
}
