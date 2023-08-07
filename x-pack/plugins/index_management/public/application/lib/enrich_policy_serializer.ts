/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseEnrichPolicy, EnrichPolicyType } from '../types';

const getPolicyType = (policy: BaseEnrichPolicy): EnrichPolicyType => {
  if (policy.config.match) {
    return 'match';
  }

  if (policy.config.geo_match) {
    return 'geo_match';
  }

  if (policy.config.range) {
    return 'range';
  }

  return '';
};

export const serializeEnrichmentPolicies = (policies: BaseEnrichPolicy[]) => {
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
