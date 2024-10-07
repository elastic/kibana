/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import { getDefinitionForEntityType } from '../definition';
import {
  type FieldRetentionDefinition,
  getFieldRetentionDefinition,
} from '../field_retention_definitions';
import {
  debugDeepCopyContextStep,
  getDotExpanderSteps,
  getRemoveEmptyFieldSteps,
  removeEntityDefinitionFieldsStep,
  retentionDefinitionToIngestProcessorSteps,
} from './ingest_processor_steps';
import { getIdentityFieldForEntityType } from '../utils';
import { getFieldRetentionEnrichPolicyName } from './enrich_policy';

const getPlatformPipelineId = (definition: ReturnType<typeof getDefinitionForEntityType>) => {
  return `${definition.id}-latest@platform`;
};

// the field that the enrich processor writes to
export const ENRICH_FIELD = 'historical';

/**
 * Builds the ingest pipeline for the field retention policy.
 * Broadly the pipeline enriches the entity with the field retention enrich policy,
 * then applies the field retention policy to the entity fields, and finally removes
 * the enrich field and any empty fields.
 *
 * While developing, be sure to set debugMode to true this will keep the enrich field
 * and the context field in the document to help with debugging.
 */
const buildIngestPipeline = ({
  fieldRetentionDefinition,
  allEntityFields,
  debugMode,
  namespace,
}: {
  fieldRetentionDefinition: FieldRetentionDefinition;
  allEntityFields: string[];
  debugMode?: boolean;
  namespace: string;
}): IngestProcessorContainer[] => {
  const enrichPolicyName = getFieldRetentionEnrichPolicyName(
    namespace,
    fieldRetentionDefinition.entityType
  );
  const { entityType, matchField } = fieldRetentionDefinition;
  return [
    ...(debugMode ? [debugDeepCopyContextStep()] : []),
    {
      enrich: {
        policy_name: enrichPolicyName,
        field: matchField,
        target_field: ENRICH_FIELD,
      },
    },
    {
      set: {
        field: '@timestamp',
        value: '{{entity.lastSeenTimestamp}}',
      },
    },
    {
      set: {
        field: 'entity.name',
        value: `{{${getIdentityFieldForEntityType(entityType)}}}`,
      },
    },
    ...getDotExpanderSteps(allEntityFields),
    ...retentionDefinitionToIngestProcessorSteps(fieldRetentionDefinition, {
      enrichField: ENRICH_FIELD,
    }),
    ...getRemoveEmptyFieldSteps([...allEntityFields, 'asset', `${entityType}.risk`]),
    removeEntityDefinitionFieldsStep(),
    ...(!debugMode
      ? [
          {
            remove: {
              ignore_failure: true,
              field: ENRICH_FIELD,
            },
          },
        ]
      : []),
  ];
};

export const createPlatformPipeline = async ({
  namespace,
  entityType,
  fieldHistoryLength,
  logger,
  esClient,
  debugMode,
}: {
  namespace: string;
  fieldHistoryLength: number;
  entityType: EntityType;
  logger: Logger;
  esClient: ElasticsearchClient;
  debugMode?: boolean;
}) => {
  const definition = getDefinitionForEntityType(entityType, namespace);
  const fieldRetentionDefinition = getFieldRetentionDefinition({
    entityType,
    fieldHistoryLength,
  });
  const allEntityFields: string[] = (definition?.metadata || []).map((m) => {
    if (typeof m === 'string') {
      return m;
    }

    return m.destination;
  });

  const pipeline = {
    id: getPlatformPipelineId(definition),
    body: {
      _meta: {
        managed_by: 'entity_store',
        managed: true,
      },
      description: `Ingest pipeline for entity defiinition ${definition.id}`,
      processors: buildIngestPipeline({
        namespace,
        fieldRetentionDefinition,
        allEntityFields,
        debugMode,
      }),
    },
  };

  logger.debug(`Attempting to create pipeline: ${JSON.stringify(pipeline)}`);

  await esClient.ingest.putPipeline(pipeline);
};

export const deletePlatformPipeline = ({
  entityType,
  namespace,
  logger,
  esClient,
}: {
  entityType: EntityType;
  namespace: string;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const definition = getDefinitionForEntityType(entityType, namespace);
  const pipelineId = getPlatformPipelineId(definition);
  logger.debug(`Attempting to delete pipeline: ${pipelineId}`);
  return esClient.ingest.deletePipeline(
    {
      id: pipelineId,
    },
    {
      ignore: [404],
    }
  );
};
