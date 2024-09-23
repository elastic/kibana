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
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store/common.gen';
import { getFieldRetentionDefinition } from './field_retention_definitions';
import type { FieldRetentionDefinition } from './types';
import { getEntitiesIndexName } from '../utils/utils';
import { buildFieldRetentionPipeline } from './field_retention_ingest_pipeline';

const HISTORICAL_FIELD = 'historical';

const getEnrichPolicyName = (spaceId: string, definition: FieldRetentionDefinition) =>
  `entity_store_field_retention_${definition.entityType}_${spaceId}_v${definition.version}`;

const getFieldRetentionEnrichPolicy = (
  entityType: EntityType,
  spaceId: string
): EnrichPutPolicyRequest => {
  const definition = getFieldRetentionDefinition(entityType);
  // TODO: all this needs spaces support
  return {
    name: getEnrichPolicyName(spaceId, definition),
    match: {
      indices: getEntitiesIndexName(entityType),
      match_field: definition.matchField,
      enrich_fields: definition.fields.map(({ field }) => field),
    },
  };
};

export const createFieldRetentionEnrichPolicy = async ({
  spaceId,
  esClient,
  entityType,
}: {
  spaceId: string;
  esClient: ElasticsearchClient;
  entityType: EntityType;
}) => {
  const policy = getFieldRetentionEnrichPolicy(entityType, spaceId);
  console.log('policy', JSON.stringify(policy));
  return esClient.enrich.putPolicy(policy);
};

export const executeFieldRetentionEnrichPolicy = async ({
  spaceId,
  entityType,
  esClient,
}: {
  spaceId: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
}) => {
  const policy = getFieldRetentionEnrichPolicy(entityType, spaceId);
  return esClient.enrich.executePolicy({ name: policy.name });
};

export const deleteFieldRetentionEnrichPolicy = async ({
  spaceId,
  entityType,
  esClient,
}: {
  spaceId: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
}) => {
  const policy = getFieldRetentionEnrichPolicy(entityType, spaceId);
  return esClient.enrich.deletePolicy({ name: policy.name });
};

export const getFieldRetentionPipelineSteps = ({
  spaceId,
  entityType,
  debugMode = false,
}: {
  spaceId: string;
  entityType: EntityType;
  debugMode?: boolean;
}): IngestProcessorContainer[] => {
  const definition = getFieldRetentionDefinition(entityType);
  const steps: IngestProcessorContainer[] = [
    {
      enrich: {
        policy_name: getEnrichPolicyName(spaceId, definition),
        field: definition.matchField,
        target_field: HISTORICAL_FIELD,
      },
    },
    ...buildFieldRetentionPipeline(definition, HISTORICAL_FIELD),
  ];

  if (!debugMode) {
    steps.push({
      remove: {
        field: `${HISTORICAL_FIELD}`,
      },
    });
  }

  console.log('steps', JSON.stringify(steps));

  return steps;
};
