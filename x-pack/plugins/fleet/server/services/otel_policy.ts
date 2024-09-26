/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { OtelPolicy } from '../../common/types/models/otel';
import { SO_SEARCH_LIMIT } from '../constants';
import { OTEL_POLICY_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { OtelPolicySOAttributes } from '../types';

import { escapeSearchQueryPhrase } from './saved_object';

export async function findAllOtelPoliciesForAgentPolicy(
  soClient: SavedObjectsClientContract,
  agentPolicyId: string
): Promise<OtelPolicy[]> {
  const otelPolicySO = await soClient.find<OtelPolicySOAttributes>({
    type: OTEL_POLICY_SAVED_OBJECT_TYPE,
    filter: `${OTEL_POLICY_SAVED_OBJECT_TYPE}.attributes.policy_ids:${escapeSearchQueryPhrase(
      agentPolicyId
    )}`,
    perPage: SO_SEARCH_LIMIT,
  });
  if (!otelPolicySO) {
    return [];
  }

  const otelPolicies = otelPolicySO.saved_objects.map((so) => ({
    id: so.id,
    version: so.version,
    ...so.attributes,
  }));

  return otelPolicies;
}
