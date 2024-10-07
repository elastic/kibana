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
import type { FieldRetentionDefinition } from './field_retention_definitions';
import { getEntitiesIndexName } from '../utils/utils';
import { buildFieldRetentionIngestPipeline } from './build_field_retention_ingest_pipeline';

const getEnrichPolicyName = (namespace: string, definition: FieldRetentionDefinition) =>
  `entity_store_field_retention_${definition.entityType}_${namespace}_v${definition.version}`;

const getFieldRetentionEnrichPolicy = (
  entityType: EntityType,
  namespace: string
): EnrichPutPolicyRequest => {
  const definition = getFieldRetentionDefinition(entityType);
  return {
    name: getEnrichPolicyName(namespace, definition),
    match: {
      indices: getEntitiesIndexName(entityType, namespace),
      match_field: definition.matchField,
      enrich_fields: definition.fields.map(({ field }) => field),
    },
  };
};

export const createFieldRetentionEnrichPolicy = async ({
  namespace,
  esClient,
  entityType,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
  entityType: EntityType;
}) => {
  const policy = getFieldRetentionEnrichPolicy(entityType, namespace);
  return esClient.enrich.putPolicy(policy);
};

export const executeFieldRetentionEnrichPolicy = async ({
  namespace,
  entityType,
  esClient,
}: {
  namespace: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
}) => {
  const policy = getFieldRetentionEnrichPolicy(entityType, namespace);
  return esClient.enrich.executePolicy({ name: policy.name });
};

export const deleteFieldRetentionEnrichPolicy = async ({
  namespace,
  entityType,
  esClient,
}: {
  namespace: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
}) => {
  const policy = getFieldRetentionEnrichPolicy(entityType, namespace);
  return esClient.enrich.deletePolicy({ name: policy.name });
};

export const getFieldRetentionPipelineSteps = (opts: {
  namespace: string;
  entityType: EntityType;
  debugMode?: boolean;
  allEntityFields: string[];
}): IngestProcessorContainer[] =>
  buildFieldRetentionIngestPipeline({
    ...opts,
    fieldRetentionDefinition: getFieldRetentionDefinition(opts.entityType),
    enrichPolicyName: getEnrichPolicyName(
      opts.namespace,
      getFieldRetentionDefinition(opts.entityType)
    ),
  });
