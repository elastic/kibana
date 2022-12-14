/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ENDPOINT_PRIVILEGES = [
  'writeEndpointList',
  'readEndpointList',
  'writeTrustedApplications',
  'readTrustedApplications',
  'writeHostIsolationExceptions',
  'readHostIsolationExceptions',
  'writeBlocklist',
  'readBlocklist',
  'writeEventFilters',
  'readEventFilters',
  'writePolicyManagement',
  'readPolicyManagement',
  'writeActionsLogManagement',
  'readActionsLogManagement',
  'writeHostIsolation',
  'writeProcessOperations',
  'writeFileOperations',
] as const;
