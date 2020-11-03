/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PACKAGES_SAVED_OBJECT_TYPE = 'epm-packages';
export const INDEX_PATTERN_SAVED_OBJECT_TYPE = 'index-pattern';
export const INDEX_PATTERN_PLACEHOLDER_SUFFIX = '-index_pattern_placeholder';
export const MAX_TIME_COMPLETE_INSTALL = 60000;

export const requiredPackages = {
  System: 'system',
  Endpoint: 'endpoint',
} as const;

export const agentAssetTypes = {
  Input: 'input',
} as const;

export const dataTypes = {
  Logs: 'logs',
  Metrics: 'metrics',
} as const;
