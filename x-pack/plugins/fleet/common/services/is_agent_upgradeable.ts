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

export const AGENT_UPGRADE_COOLDOWN_IN_MIN = 10;

export function isAgentUpgradeable(
  agent: Agent,
  latestAgentVersion: string,
  versionToUpgrade?: string
) {
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
  if (isAgentUpgrading(agent)) {
    return false;
  }
  if (getRecentUpgradeInfoForAgent(agent).hasBeenUpgradedRecently) {
    return false;
  }
  if (versionToUpgrade !== undefined) {
    return isNotDowngrade(agentVersion, versionToUpgrade);
  }
  return isAgentVersionLessThanLatest(agentVersion, latestAgentVersion);
}

const isAgentVersionLessThanLatest = (agentVersion: string, latestAgentVersion: string) => {
  // make sure versions are only the number before comparison
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error('agent version is not valid');
  const latestAgentVersionNumber = semverCoerce(latestAgentVersion);
  if (!latestAgentVersionNumber) throw new Error('latest version is not valid');

  return semverLt(agentVersionNumber, latestAgentVersionNumber);
};

const isNotDowngrade = (agentVersion: string, versionToUpgrade: string) => {
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error('agent version is not valid');
  const versionToUpgradeNumber = semverCoerce(versionToUpgrade);
  if (!versionToUpgradeNumber) throw new Error('target version is not valid');

  return semverGt(versionToUpgradeNumber, agentVersionNumber);
};

export function getRecentUpgradeInfoForAgent(agent: Agent): {
  hasBeenUpgradedRecently: boolean;
  timeToWaitMs: number;
} {
  if (!agent.upgraded_at) {
    return {
      hasBeenUpgradedRecently: false,
      timeToWaitMs: 0,
    };
  }

  const elaspedSinceUpgradeInMillis = Date.now() - Date.parse(agent.upgraded_at);
  const timeToWaitMs = AGENT_UPGRADE_COOLDOWN_IN_MIN * 6e4 - elaspedSinceUpgradeInMillis;
  const hasBeenUpgradedRecently = elaspedSinceUpgradeInMillis / 6e4 < AGENT_UPGRADE_COOLDOWN_IN_MIN;

  return { hasBeenUpgradedRecently, timeToWaitMs };
}

export function isAgentUpgrading(agent: Agent) {
  if (agent.upgrade_details) {
    return agent.upgrade_details.state !== 'UPG_FAILED';
  }
  return agent.upgrade_started_at && !agent.upgraded_at;
}
