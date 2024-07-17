/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClient } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../constants';
import { packagePolicyService } from '../services';

export interface IntegrationsDetails {
  totalPoliciesCount: number;
  totalSharedCount: number;
  sharedIntegrations: SharedIntegration;
}

interface SharedIntegration {
  name: string;
  sharedByPoliciesCount: number;
  pkgName?: string;
  pkgVersion?: string;
  agents?: number;
}

export const getIntegrationsDetails = async (
  soClient?: SavedObjectsClient
): Promise<IntegrationsDetails[]> => {
  if (!soClient) {
    return [];
  }
  const allPackagePolicies = await packagePolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });
  const totalPoliciesCount = allPackagePolicies.items.length;

  const sharedPackagePolicies = allPackagePolicies.items.filter((packagePolicy) => {
    if (packagePolicy.policy_ids.length > 1) return packagePolicy;
  });
  const totalSharedCount = sharedPackagePolicies.length;

  const integrationsDetails: IntegrationsDetails[] = (sharedPackagePolicies || []).map(
    (packagePolicy) => {
      return {
        totalPoliciesCount,
        totalSharedCount,
        sharedIntegrations: {
          name: packagePolicy.name,
          pkgName: packagePolicy.package?.name,
          pkgVersion: packagePolicy.package?.version,
          sharedByPoliciesCount: packagePolicy.policy_ids.length,
          agents: packagePolicy.agents,
        },
      };
    }
  );
  return integrationsDetails;
};
