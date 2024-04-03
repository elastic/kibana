/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGt from 'semver/functions/gt';
import semverMajor from 'semver/functions/major';
import semverMinor from 'semver/functions/minor';

import type { Agent } from '../types';

import { AgentRequestInvalidError } from '../errors';

import { differsOnlyInPatch } from '.';
import { getMaxVersion } from './get_min_max_version';

// Check the installed fleet server version
export const checkFleetServerVersion = (
  versionToUpgradeNumber: string,
  fleetServerAgents: Agent[],
  force = false
) => {
  const message = getFleetServerVersionMessage(versionToUpgradeNumber, fleetServerAgents, force);
  if (force && message) throw new AgentRequestInvalidError(message);
  if (message) throw new Error(message);
};

export const getFleetServerVersionMessage = (
  versionToUpgradeNumber: string | undefined,
  fleetServerAgents: Agent[],
  force = false
) => {
  const fleetServerVersions = fleetServerAgents.map(
    (agent) => agent.local_metadata.elastic.agent.version
  ) as string[];

  const maxFleetServerVersion = getMaxVersion(fleetServerVersions);

  if (!maxFleetServerVersion || !versionToUpgradeNumber) {
    return;
  }
  try {
    if (
      !force &&
      semverGt(versionToUpgradeNumber, maxFleetServerVersion) &&
      !differsOnlyInPatch(versionToUpgradeNumber, maxFleetServerVersion)
    ) {
      return `Cannot upgrade to version ${versionToUpgradeNumber} because it is higher than the latest fleet server version ${maxFleetServerVersion}.`;
    }

    const fleetServerMajorGt =
      semverMajor(maxFleetServerVersion) > semverMajor(versionToUpgradeNumber);
    const fleetServerMajorEqMinorGte =
      semverMajor(maxFleetServerVersion) === semverMajor(versionToUpgradeNumber) &&
      semverMinor(maxFleetServerVersion) >= semverMinor(versionToUpgradeNumber);

    // When force is enabled, only the major and minor versions are checked
    if (force && !(fleetServerMajorGt || fleetServerMajorEqMinorGte)) {
      return `Cannot force upgrade to version ${versionToUpgradeNumber} because it does not satisfy the major and minor of the latest fleet server version ${maxFleetServerVersion}.`;
    }
  } catch (e) {
    return e.message;
  }
};

export const isAgentVersionLessThanFleetServer = (
  versionToUpgradeNumber: string | undefined,
  fleetServerAgents: Agent[],
  force = false
) => {
  // For serverless it should not have any fleet server agents
  if (fleetServerAgents.length === 0) {
    return true;
  }
  const fleetServerVersions = fleetServerAgents.map(
    (agent) => agent.local_metadata.elastic.agent.version
  ) as string[];

  const maxFleetServerVersion = getMaxVersion(fleetServerVersions);

  if (!maxFleetServerVersion || !versionToUpgradeNumber) {
    return false;
  }
  try {
    if (
      !force &&
      semverGt(versionToUpgradeNumber, maxFleetServerVersion) &&
      !differsOnlyInPatch(versionToUpgradeNumber, maxFleetServerVersion)
    )
      return false;

    const fleetServerMajorGt =
      semverMajor(maxFleetServerVersion) > semverMajor(versionToUpgradeNumber);
    const fleetServerMajorEqMinorGte =
      semverMajor(maxFleetServerVersion) === semverMajor(versionToUpgradeNumber) &&
      semverMinor(maxFleetServerVersion) >= semverMinor(versionToUpgradeNumber);

    // When force is enabled, only the major and minor versions are checked
    if (force && !(fleetServerMajorGt || fleetServerMajorEqMinorGte)) {
      return false;
    }
  } catch (e) {
    return false;
  }

  return true;
};
