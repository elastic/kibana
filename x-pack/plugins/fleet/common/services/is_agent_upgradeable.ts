/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverCoerce from 'semver/functions/coerce';
import semverLt from 'semver/functions/lt';
import semverGt from 'semver/functions/gt';
import semverEq from 'semver/functions/eq';
import moment from 'moment';

import type { Agent } from '../types';

export const AGENT_UPGRADE_COOLDOWN_IN_MIN = 10;

// Error messages for agent not upgradeable
export const VERSION_MISSING_ERROR = `agent version is missing.`;
export const UNENROLLED_ERROR = `agent has been unenrolled.`;
export const ONGOING_UNEROLLMENT_ERROR = `agent is being unenrolled.`;
export const NOT_UPGRADEABLE_ERROR = `agent cannot be upgraded through Fleet. It may be running in a container or it is not installed as a service.`;
export const ALREADY_UPGRADED_ERROR = `agent is already being upgraded.`;
export const INVALID_VERSION_ERROR = 'agent version is not valid.';
export const SELECTED_VERSION_ERROR = 'the selected version is not valid.';
export const RUNNING_SELECTED_VERSION_ERROR = `agent is already running on the selected version.`;
export const DOWNGRADE_NOT_ALLOWED_ERROR = `agent does not support downgrades.`;
export const LATEST_VERSION_NOT_VALID_ERROR = 'latest version is not valid.';
export const AGENT_ALREADY_ON_LATEST_ERROR = `agent is already running on the latest available version.`;
export const AGENT_ON_GREATER_VERSION_ERROR = `agent is running on a version greater than the latest available version.`;

export function isAgentUpgradeAvailable(agent: Agent, latestAgentVersion?: string): boolean {
  return (
    latestAgentVersion &&
    isAgentUpgradeable(agent) &&
    agent?.local_metadata?.elastic?.agent?.version &&
    isAgentVersionLessThanLatest(agent.local_metadata.elastic.agent.version, latestAgentVersion)
  );
}

export function isAgentUpgradeable(agent: Agent): boolean {
  if (agent.unenrollment_started_at || agent.unenrolled_at) {
    return false;
  }
  if (!agent.local_metadata?.elastic?.agent?.upgradeable) {
    return false;
  }
  if (isAgentUpgrading(agent)) {
    return false;
  }
  if (getRecentUpgradeInfoForAgent(agent).hasBeenUpgradedRecently) {
    return false;
  }
  return true;
}

export function isAgentUpgradeableToVersion(agent: Agent, versionToUpgrade?: string): boolean {
  const isAgentUpgradeableCheck = isAgentUpgradeable(agent);
  if (!isAgentUpgradeableCheck) return false;
  let agentVersion: string;
  if (typeof agent?.local_metadata?.elastic?.agent?.version === 'string') {
    agentVersion = agent.local_metadata.elastic.agent.version;
  } else {
    return false;
  }
  if (!versionToUpgrade) {
    return false;
  }
  return isNotDowngrade(agentVersion, versionToUpgrade);
}

export const isAgentVersionLessThanLatest = (
  agentVersion: string,
  latestAgentVersion: string
): boolean => {
  // make sure versions are only the number before comparison
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error(`${INVALID_VERSION_ERROR}`);
  const latestAgentVersionNumber = semverCoerce(latestAgentVersion);
  if (!latestAgentVersionNumber) throw new Error(`${LATEST_VERSION_NOT_VALID_ERROR}`);

  return semverLt(agentVersionNumber, latestAgentVersionNumber);
};

// Based on the previous, returns a detailed message explaining why the agent is not upgradeable
export const getNotUpgradeableMessage = (
  agent: Agent,
  latestAgentVersion?: string,
  versionToUpgrade?: string
): string | undefined => {
  let agentVersion: string;
  if (typeof agent?.local_metadata?.elastic?.agent?.version === 'string') {
    agentVersion = agent.local_metadata.elastic.agent.version;
  } else {
    return VERSION_MISSING_ERROR;
  }
  if (agent.unenrolled_at) {
    return UNENROLLED_ERROR;
  }
  if (agent.unenrollment_started_at) {
    return ONGOING_UNEROLLMENT_ERROR;
  }
  if (!agent.local_metadata.elastic.agent.upgradeable) {
    return NOT_UPGRADEABLE_ERROR;
  }
  if (isAgentUpgrading(agent)) {
    return ALREADY_UPGRADED_ERROR;
  }
  if (getRecentUpgradeInfoForAgent(agent).hasBeenUpgradedRecently) {
    const timeToWaitMins = getRecentUpgradeInfoForAgent(agent).timeToWaitMins;
    const elapsedMinsSinceUpgrade = getRecentUpgradeInfoForAgent(agent).elapsedMinsSinceUpgrade;
    return `agent was upgraded ${elapsedMinsSinceUpgrade} minutes ago, please wait ${timeToWaitMins} minutes before attempting the upgrade again.`;
  }
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) return INVALID_VERSION_ERROR;

  if (versionToUpgrade !== undefined) {
    const versionToUpgradeNumber = semverCoerce(versionToUpgrade);
    if (!versionToUpgradeNumber) return SELECTED_VERSION_ERROR;

    if (semverEq(agentVersionNumber, versionToUpgradeNumber)) return RUNNING_SELECTED_VERSION_ERROR;

    if (semverLt(versionToUpgradeNumber, agentVersionNumber)) return DOWNGRADE_NOT_ALLOWED_ERROR;

    // explicitly allow this case - the agent is upgradeable
    if (semverGt(versionToUpgradeNumber, agentVersionNumber)) return undefined;
  }

  const latestAgentVersionNumber = semverCoerce(latestAgentVersion);
  if (!latestAgentVersionNumber) return LATEST_VERSION_NOT_VALID_ERROR;

  if (semverGt(agentVersionNumber, latestAgentVersionNumber)) return AGENT_ON_GREATER_VERSION_ERROR;

  // in all the other cases, the agent is upgradeable; don't return any message.
  return undefined;
};

const isNotDowngrade = (agentVersion: string, versionToUpgrade: string): boolean => {
  const agentVersionNumber = semverCoerce(agentVersion);
  if (!agentVersionNumber) throw new Error(`${INVALID_VERSION_ERROR}`);
  const versionToUpgradeNumber = semverCoerce(versionToUpgrade);
  if (!versionToUpgradeNumber) return true;

  return semverGt(versionToUpgradeNumber, agentVersionNumber);
};

export function getRecentUpgradeInfoForAgent(agent: Agent): {
  hasBeenUpgradedRecently: boolean;
  timeToWaitMs: number;
  elapsedMinsSinceUpgrade: number;
  timeToWaitMins: number;
} {
  if (!agent.upgraded_at) {
    return {
      hasBeenUpgradedRecently: false,
      timeToWaitMs: 0,
      timeToWaitMins: 0,
      elapsedMinsSinceUpgrade: 0,
    };
  }

  const elapsedSinceUpgradeInMillis = Date.now() - Date.parse(agent.upgraded_at);
  const elapsedMins = moment.duration(elapsedSinceUpgradeInMillis, 'milliseconds').asMinutes();
  const elapsedMinsSinceUpgrade = Math.ceil(elapsedMins);

  const timeToWaitMs = AGENT_UPGRADE_COOLDOWN_IN_MIN * 6e4 - elapsedSinceUpgradeInMillis;
  const hasBeenUpgradedRecently = elapsedSinceUpgradeInMillis / 6e4 < AGENT_UPGRADE_COOLDOWN_IN_MIN;
  const timeToWait = moment.duration(timeToWaitMs, 'milliseconds').asMinutes();
  const timeToWaitMins = Math.ceil(timeToWait);
  return { hasBeenUpgradedRecently, timeToWaitMs, elapsedMinsSinceUpgrade, timeToWaitMins };
}

export function isAgentUpgrading(agent: Agent) {
  if (agent.upgrade_details) {
    return agent.upgrade_details.state !== 'UPG_FAILED';
  }
  return agent.upgrade_started_at && !agent.upgraded_at;
}

export const differsOnlyInPatch = (
  versionA: string,
  versionB: string,
  allowEqualPatch: boolean = true
): boolean => {
  const [majorA, minorA, patchA] = versionA.split('.');
  const [majorB, minorB, patchB] = versionB.split('.');

  return (
    majorA === majorB && minorA === minorB && (allowEqualPatch ? patchA >= patchB : patchA > patchB)
  );
};
