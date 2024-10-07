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
import type { EntityType } from '../../../../../common/api/entity_analytics';
import {
  getFieldRetentionDefinitionMetadata,
  type FieldRetentionDefinition,
  getFieldRetentionDefinitionWithDefaults,
} from './field_retention_definitions';
import { getEntitiesIndexName } from '../utils';
import { buildFieldRetentionIngestPipeline } from './build_field_retention_ingest_pipeline';

const getEnrichPolicyName = (namespace: string, entityType: EntityType) => {
  const metadata = getFieldRetentionDefinitionMetadata(entityType);
  return `entity_store_field_retention_${metadata.entityType}_${namespace}_v${metadata.version}`;
};

const getFieldRetentionEnrichPolicy = ({
  namespace,
  entityType,
}: {
  namespace: string;
  entityType: EntityType;
}): EnrichPutPolicyRequest => {
  const { fields, matchField } = getFieldRetentionDefinitionWithDefaults(entityType);
  return {
    name: getEnrichPolicyName(namespace, entityType),
    match: {
      indices: getEntitiesIndexName(entityType, namespace),
      match_field: matchField,
      enrich_fields: fields.map(({ field }) => field),
    },
  };
};

export const createFieldRetentionEnrichPolicy = async ({
  esClient,
  entityType,
  namespace,
}: {
  entityType: EntityType;
  esClient: ElasticsearchClient;
  namespace: string;
}) => {
  const policy = getFieldRetentionEnrichPolicy({
    namespace,
    entityType,
  });
  return esClient.enrich.putPolicy(policy);
};

export const executeFieldRetentionEnrichPolicy = async ({
  namespace,
  esClient,
  entityType,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
  entityType: EntityType;
}) => {
  const name = getEnrichPolicyName(namespace, entityType);
  return esClient.enrich.executePolicy({ name });
};

export const deleteFieldRetentionEnrichPolicy = async ({
  namespace,
  esClient,
  entityType,
}: {
  namespace: string;
  esClient: ElasticsearchClient;
  entityType: EntityType;
}) => {
  const name = getEnrichPolicyName(namespace, entityType);
  return esClient.enrich.deletePolicy({ name }, { ignore: [404] });
};

export const getFieldRetentionPipelineSteps = ({
  fieldRetentionDefinition,
  namespace,
  allEntityFields,
  debugMode,
}: {
  namespace: string;
  debugMode?: boolean;
  allEntityFields: string[];
  fieldRetentionDefinition: FieldRetentionDefinition;
}): IngestProcessorContainer[] => {
  const enrichPolicyName = getEnrichPolicyName(namespace, fieldRetentionDefinition.entityType);

  return buildFieldRetentionIngestPipeline({
    allEntityFields,
    fieldRetentionDefinition,
    enrichPolicyName,
    debugMode,
  });
};
