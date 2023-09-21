/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointSecurityRoleNames } from '../../../../scripts/endpoint/common/roles_users';

export type KibanaKnownUserAccounts = typeof KIBANA_KNOWN_DEFAULT_ACCOUNTS[number];

export type SecurityTestUser = EndpointSecurityRoleNames | KibanaKnownUserAccounts;

export const KIBANA_KNOWN_DEFAULT_ACCOUNTS = [
  'elastic',
  'elastic_serverless',
  'system_indices_superuser',
] as const;
