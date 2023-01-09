/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

const SECURITY_SOLUTION_APP_ID = 'siem';

interface PrivilegeMapObject {
  appId: string;
  privilegeSplit: string;
  privilegeType: 'ui' | 'api';
  privilegeName: string;
}

/**
 * defines endpoint package privileges
 * the key is the name of the packagePrivilege (ie. 'readSecuritySolution')
 * the value object is for mapping kibana privileges and capabilities
 * see x-pack/plugins/fleet/server/services/security/security.ts for example of how object values are used
 */
export const ENDPOINT_PRIVILEGES: Record<string, PrivilegeMapObject> = deepFreeze({
  readSecuritySolution: {
    appId: SECURITY_SOLUTION_APP_ID,
    privilegeSplit: '/',
    privilegeType: 'ui',
    privilegeName: 'show',
  },
  writeSecuritySolution: {
    appId: SECURITY_SOLUTION_APP_ID,
    privilegeSplit: '/',
    privilegeType: 'ui',
    privilegeName: 'crud',
  },
  writeEndpointList: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeEndpointList',
  },
  readEndpointList: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readEndpointList',
  },
  writeTrustedApplications: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeTrustedApplications',
  },
  readTrustedApplications: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readTrustedApplications',
  },
  writeHostIsolationExceptions: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeHostIsolationExceptions',
  },
  readHostIsolationExceptions: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readHostIsolationExceptions',
  },
  writeBlocklist: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeBlocklist',
  },
  readBlocklist: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readBlocklist',
  },
  writeEventFilters: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeEventFilters',
  },
  readEventFilters: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readEventFilters',
  },
  writePolicyManagement: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writePolicyManagement',
  },
  readPolicyManagement: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readPolicyManagement',
  },
  writeActionsLogManagement: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeActionsLogManagement',
  },
  readActionsLogManagement: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'readActionsLogManagement',
  },
  writeHostIsolation: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeHostIsolation',
  },
  writeProcessOperations: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeProcessOperations',
  },
  writeFileOperations: {
    appId: DEFAULT_APP_CATEGORIES.security.id,
    privilegeSplit: '-',
    privilegeType: 'api',
    privilegeName: 'writeFileOperations',
  },
});
