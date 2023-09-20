/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Role } from '@kbn/security-plugin/common';
import { getT1Analyst } from './t1_analyst';
import { getT2Analyst } from './t2_analyst';
import { getHunter } from './hunter';
import { getThreatIntelligenceAnalyst } from './threat_intelligence_analyst';
import { getSocManager } from './soc_manager';
import { getPlatformEngineer } from './platform_engineer';
import { getEndpointOperationsAnalyst } from './endpoint_operations_analyst';
import {
  getEndpointSecurityPolicyManagementReadRole,
  getEndpointSecurityPolicyManager,
} from './endpoint_security_policy_manager';
import { getDetectionsEngineer } from './detections_engineer';
import { getWithResponseActionsRole } from './with_response_actions_role';
import { getNoResponseActionsRole } from './without_response_actions_role';

export * from './with_response_actions_role';
export * from './without_response_actions_role';
export * from './t1_analyst';
export * from './t2_analyst';
export * from './hunter';
export * from './threat_intelligence_analyst';
export * from './soc_manager';
export * from './platform_engineer';
export * from './endpoint_operations_analyst';
export * from './endpoint_security_policy_manager';
export * from './detections_engineer';

export const getAllRoles = (): Record<string, Role> => {
  return {
    t1Analyst: {
      ...getT1Analyst(),
      name: 't1Analyst',
    },
    t2Analyst: {
      ...getT2Analyst(),
      name: 't2Analyst',
    },
    hunter: {
      ...getHunter(),
      name: 'hunter',
    },
    threatIntelligenceAnalyst: {
      ...getThreatIntelligenceAnalyst(),
      name: 'threatIntelligenceAnalyst',
    },
    socManager: {
      ...getSocManager(),
      name: 'socManager',
    },
    platformEngineer: {
      ...getPlatformEngineer(),
      name: 'platformEngineer',
    },
    endpointOperationsAnalyst: {
      ...getEndpointOperationsAnalyst(),
      name: 'endpointOperationsAnalyst',
    },
    endpointSecurityPolicyManager: {
      ...getEndpointSecurityPolicyManager(),
      name: 'endpointSecurityPolicyManager',
    },
    detectionsEngineer: {
      ...getDetectionsEngineer(),
      name: 'detectionsEngineer',
    },
    endpointResponseActionsAccess: {
      ...getWithResponseActionsRole(),
      name: 'endpointResponseActionsAccess',
    },
    endpointResponseActionsNoAccess: {
      ...getNoResponseActionsRole(),
      name: 'endpointResponseActionsNoAccess',
    },
    endpointSecurityPolicyManagementRead: {
      ...getEndpointSecurityPolicyManagementReadRole(),
      name: 'endpointSecurityPolicyManagementRead',
    },
  };
};
