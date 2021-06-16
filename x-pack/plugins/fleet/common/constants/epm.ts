/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PACKAGES_SAVED_OBJECT_TYPE = 'epm-packages';
export const ASSETS_SAVED_OBJECT_TYPE = 'epm-packages-assets';
export const MAX_TIME_COMPLETE_INSTALL = 60000;

export const FLEET_SYSTEM_PACKAGE = 'system';
export const FLEET_ELASTIC_AGENT_PACKAGE = 'elastic_agent';
export const FLEET_SERVER_PACKAGE = 'fleet_server';
export const FLEET_ENDPOINT_PACKAGE = 'endpoint';

export const requiredPackages = {
  System: FLEET_SYSTEM_PACKAGE,
  ElasticAgent: FLEET_ELASTIC_AGENT_PACKAGE,
  FleetServer: FLEET_SERVER_PACKAGE,
} as const;

// these are currently identical. we can separate if they later diverge
export const defaultPackages = requiredPackages;

export const agentAssetTypes = {
  Input: 'input',
} as const;

export const dataTypes = {
  Logs: 'logs',
  Metrics: 'metrics',
} as const;

export const installationStatuses = {
  Installed: 'installed',
  NotInstalled: 'not_installed',
} as const;
