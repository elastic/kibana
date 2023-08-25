/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { EnrichSummary, EnrichPolicyType } from '@elastic/elasticsearch/lib/api/types';
import type { SerializedEnrichPolicy } from '../../common/types';

const getPolicyType = (policy: EnrichSummary): EnrichPolicyType => {
  if (policy.config.match) {
    return 'match';
  }

  if (policy.config.geo_match) {
    return 'geo_match';
  }

  if (policy.config.range) {
    return 'range';
  }

  throw new Error('Unknown policy type');
};

export const serializeEnrichmentPolicies = (
  policies: EnrichSummary[]
): SerializedEnrichPolicy[] => {
  return policies.map((policy: any) => {
    const policyType = getPolicyType(policy);

    return {
      name: policy.config[policyType].name,
      type: policyType,
      sourceIndices: policy.config[policyType].indices,
      matchField: policy.config[policyType].match_field,
      enrichFields: policy.config[policyType].enrich_fields,
    };
  });
};

const fetchAll = async (client: IScopedClusterClient) => {
  const res = await client.asCurrentUser.enrich.getPolicy();

  return serializeEnrichmentPolicies(res.policies);
};

export const enrichPoliciesActions = {
  fetchAll,
};
