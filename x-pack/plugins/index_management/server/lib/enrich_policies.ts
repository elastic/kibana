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

export const serializeAsESPolicy = (policy: SerializedEnrichPolicy) => {
  const policyType = policy.type as EnrichPolicyType;

  return {
    [policyType]: {
      indices: policy.sourceIndices,
      match_field: policy.matchField,
      enrich_fields: policy.enrichFields,
      query: policy.query,
    },
  };
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
      query: policy.config[policyType].query,
    };
  });
};

const fetchAll = async (client: IScopedClusterClient) => {
  const res = await client.asCurrentUser.enrich.getPolicy();

  return serializeEnrichmentPolicies(res.policies);
};

const create = (
  client: IScopedClusterClient,
  policyName: string,
  serializedPolicy: EnrichSummary['config']
) => {
  return client.asCurrentUser.enrich.putPolicy({
    name: policyName,
    ...serializedPolicy,
  });
};

const execute = (client: IScopedClusterClient, policyName: string) => {
  return client.asCurrentUser.enrich.executePolicy({ name: policyName });
};

const remove = (client: IScopedClusterClient, policyName: string) => {
  return client.asCurrentUser.enrich.deletePolicy({ name: policyName });
};

export const enrichPoliciesActions = {
  fetchAll,
  create,
  execute,
  remove,
};
