/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  EnrichPutPolicyRequest,
  IngestProcessorContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { IdFieldEnum } from '../../../../common/api/entity_analytics';
import { getAssetCriticalityIndex } from '../../../../common/entity_analytics/asset_criticality';
const CURRENT_VERSION = 1;

const getEnrichPolicyName = (spaceId: string, idField: string) =>
  `asset_criticality_${idField}_${spaceId}_v${CURRENT_VERSION}`;

const getAssetCriticalityEnrichPolicyForIdField = (
  spaceId: string,
  idField: string
): EnrichPutPolicyRequest => ({
  name: getEnrichPolicyName(spaceId, idField),
  match: {
    indices: getAssetCriticalityIndex(spaceId),
    match_field: 'id_value',
    enrich_fields: ['criticality_level'],
    query: {
      term: {
        id_field: idField,
      },
    },
  },
});

const getAssetCriticalityEnrichPolicies = (spaceId: string): EnrichPutPolicyRequest[] =>
  Object.values(IdFieldEnum).map((idField) =>
    getAssetCriticalityEnrichPolicyForIdField(spaceId, idField)
  );

export const ensureAssetCriticalityEnrichPolicies = async (
  spaceId: string,
  esClient: ElasticsearchClient
): Promise<void> => {
  const enrichPolicies = getAssetCriticalityEnrichPolicies(spaceId);
  for (const policy of enrichPolicies) {
    await esClient.enrich.putPolicy(policy);
  }
};

export const executeAssetCriticalityEnrichPolicies = async (
  spaceId: string,
  esClient: ElasticsearchClient
): Promise<void> => {
  const enrichPolicies = getAssetCriticalityEnrichPolicies(spaceId);
  for (const policy of enrichPolicies) {
    await esClient.enrich.executePolicy({ name: policy.name });
  }
};

export const deleteAssetCriticalityEnrichPolicies = async (
  spaceId: string,
  esClient: ElasticsearchClient
): Promise<void> => {
  const enrichPolicies = getAssetCriticalityEnrichPolicies(spaceId);
  for (const policy of enrichPolicies) {
    await esClient.enrich.deletePolicy({ name: policy.name });
  }
};

export const getAssetCriticalityPipelineSteps = (
  spaceId: string,
  idField: string
): IngestProcessorContainer[] => [
  {
    enrich: {
      if: 'ctx.asset == null || ctx.asset.criticality == null || ctx.asset.criticality.size() == 0',
      policy_name: getEnrichPolicyName(spaceId, idField),
      field: idField,
      target_field: 'historical.asset.criticality',
    },
  },
  {
    set: {
      if: 'ctx.asset == null || ctx.asset.criticality == null || ctx.asset.criticality.size() == 0',
      field: 'asset.criticality',
      value: '{{historical.asset.criticality.criticality_level}}',
    },
  },
  {
    remove: {
      field: 'historical',
      ignore_failure: true,
    },
  },
];
