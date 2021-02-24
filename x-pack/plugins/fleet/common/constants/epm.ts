/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PACKAGES_SAVED_OBJECT_TYPE = 'epm-packages';
export const ASSETS_SAVED_OBJECT_TYPE = 'epm-packages-assets';
export const INDEX_PATTERN_SAVED_OBJECT_TYPE = 'index-pattern';
export const MAX_TIME_COMPLETE_INSTALL = 60000;

export const FLEET_SERVER_PACKAGE = 'fleet_server';

export const requiredPackages = {
  System: 'system',
  Endpoint: 'endpoint',
  ElasticAgent: 'elastic_agent',
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
