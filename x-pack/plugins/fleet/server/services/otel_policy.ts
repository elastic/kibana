/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { OtelPolicy } from '../../common/types/models/otel';
import { SO_SEARCH_LIMIT } from '../constants';
import {
  OTEL_POLICY_SAVED_OBJECT_TYPE,
  OTEL_INTEGRATION_SAVED_OBJECT_TYPE,
} from '../../common/constants';
import type { OtelPolicySOAttributes, OtelIntegrationSOAttributes } from '../types';

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

// This function finds by name the latest template uploaded through the otel/integrations endpoint and extracts the config
export async function findAndEmbedIntegrations(soClient: SavedObjectsClientContract, name: string) {
  const otelIntegrationSO = await soClient.find<OtelIntegrationSOAttributes>({
    type: OTEL_INTEGRATION_SAVED_OBJECT_TYPE,
    filter: `${OTEL_INTEGRATION_SAVED_OBJECT_TYPE}.attributes.name:${name}`,
    perPage: SO_SEARCH_LIMIT,
    sortField: 'updated_at',
    sortOrder: 'desc',
  });

  if (!otelIntegrationSO || otelIntegrationSO?.saved_objects.length === 0) {
    return {};
  }
  return otelIntegrationSO?.saved_objects[0].attributes.config;
}
