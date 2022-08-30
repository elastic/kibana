/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import semverGt from 'semver/functions/gt';

import type { Agent } from '../types';

export function isAgentUpgradeable(agent: Agent, kibanaVersion: string, versionToUpgrade?: string) {
  let agentVersion: string;
  if (typeof agent?.local_metadata?.elastic?.agent?.version === 'string') {
    agentVersion = agent.local_metadata.elastic.agent.version;
  } else {
    return false;
  }
  if (agent.unenrollment_started_at || agent.unenrolled_at) {
    return false;
  }
  if (!agent.local_metadata.elastic.agent.upgradeable) {
    return false;
  }
  // check that the agent is not already in the process of updating
  if (agent.upgrade_started_at && !agent.upgraded_at) {
    return false;
  }
  if (versionToUpgrade !== undefined) {
    return (
      isNotDowngrade(agentVersion, versionToUpgrade) &&
      isAgentVersionLessThanKibana(agentVersion, kibanaVersion)
    );
  }
  return isAgentVersionLessThanKibana(agentVersion, kibanaVersion);
}

export const isAgentVersionLessThanKibana = (agentVersion: string, kibanaVersion: string) => {
  // make sure versions are only the number before comparison
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error('agent version is not valid');
  const kibanaVersionNumber = semverCoerce(kibanaVersion);
  if (!kibanaVersionNumber) throw new Error('kibana version is not valid');

  return semverLt(agentVersionNumber, kibanaVersionNumber);
};

export const isNotDowngrade = (agentVersion: string, versionToUpgrade: string) => {
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error('agent version is not valid');
  const versionToUpgradeNumber = semverCoerce(versionToUpgrade);
  if (!versionToUpgradeNumber) throw new Error('target version is not valid');

  return semverGt(versionToUpgradeNumber, agentVersionNumber);
};
