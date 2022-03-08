/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';

import { FLEET_ELASTIC_AGENT_PACKAGE, FLEET_SERVER_PACKAGE, FLEET_SYSTEM_PACKAGE } from '.';

import { autoUpdatePackages, autoUpgradePoliciesPackages } from './epm';

// UUID v5 values require a namespace. We use UUID v5 for some of our preconfigured ID values.
export const UUID_V5_NAMESPACE = 'dde7c2de-1370-4c19-9975-b473d0e03508';

export const PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE =
  'fleet-preconfiguration-deletion-record';

export const PRECONFIGURATION_LATEST_KEYWORD = 'latest';

export const AUTO_UPDATE_PACKAGES = autoUpdatePackages.map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

// These packages default to `keep_policies_up_to_date: true` and don't allow users to opt out
export const AUTO_UPGRADE_POLICIES_PACKAGES = autoUpgradePoliciesPackages.map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

export const FLEET_PACKAGES = [
  FLEET_SYSTEM_PACKAGE,
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SERVER_PACKAGE,
].map((name) => ({
  name,
  version: PRECONFIGURATION_LATEST_KEYWORD,
}));

// Controls whether the `Keep Policies up to date` setting is exposed to the user
export const KEEP_POLICIES_UP_TO_DATE_PACKAGES = uniqBy(
  [...AUTO_UPGRADE_POLICIES_PACKAGES, ...FLEET_PACKAGES, ...AUTO_UPDATE_PACKAGES],
  ({ name }) => name
);

export interface PreconfigurationError {
  package?: { name: string; version: string };
  agentPolicy?: { name: string };
  error: Error;
}
