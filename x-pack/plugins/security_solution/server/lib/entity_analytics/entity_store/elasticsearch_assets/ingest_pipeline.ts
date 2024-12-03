/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { EngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';

import {
  debugDeepCopyContextStep,
  getDotExpanderSteps,
  getRemoveEmptyFieldSteps,
  removeEntityDefinitionFieldsStep,
} from './ingest_processor_steps';

import { getFieldRetentionEnrichPolicyName } from './enrich_policy';

import type { EntityEngineInstallationDescriptor } from '../united_entity_definitions/types';
import { fieldOperatorToIngestProcessor } from '../field_retention_definition';

const getPlatformPipelineId = (descriptionId: string) => {
  return `${descriptionId}-latest@platform`;
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
  allEntityFields,
  debugMode,
  namespace,
  description,
}: {
  allEntityFields: string[];
  debugMode?: boolean;
  namespace: string;
  version: string;
  description: EntityEngineInstallationDescriptor;
}): IngestProcessorContainer[] => {
  const enrichPolicyName = getFieldRetentionEnrichPolicyName({
    namespace,
    entityType: description.entityType,
    version: description.version,
  });

  /**
   * 

  const old = [
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
        value: '{{entity.last_seen_timestamp}}',
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
  */

  return [
    ...(debugMode ? [debugDeepCopyContextStep()] : []),
    {
      enrich: {
        policy_name: enrichPolicyName,
        field: description.identityFields[0], // TODO figure out what happens when there are multiple identity fields
        target_field: ENRICH_FIELD,
      },
    },
    {
      set: {
        field: '@timestamp',
        value: '{{entity.last_seen_timestamp}}',
      },
    },
    {
      set: {
        field: 'entity.name',
        value: `{{${description.identityFields[0]}}}`,
      },
    },
    ...getDotExpanderSteps(allEntityFields),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ...description.fields.map(({ destination, retention: retention_operator }) =>
      fieldOperatorToIngestProcessor(
        { field: destination, ...retention_operator },
        { enrichField: ENRICH_FIELD }
      )
    ),
    ...getRemoveEmptyFieldSteps([...allEntityFields, 'asset', `${description.entityType}.risk`]),
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

// developing the pipeline is a bit tricky, so we have a debug mode
// set  xpack.securitySolution.entityAnalytics.entityStore.developer.pipelineDebugMode
// to true to keep the enrich field and the context field in the document to help with debugging.
export const createPlatformPipeline = async ({
  logger,
  esClient,
  debugMode,
  description,
  options,
}: {
  description: EntityEngineInstallationDescriptor;
  options: { namespace: string };
  logger: Logger;
  esClient: ElasticsearchClient;
  debugMode?: boolean;
}) => {
  const allEntityFields = description.fields.map(({ destination }) => destination);

  const pipeline = {
    id: getPlatformPipelineId(description.id),
    body: {
      _meta: {
        managed_by: 'entity_store',
        managed: true,
      },
      description: `Ingest pipeline for entity definition ${description.id}`,
      processors: buildIngestPipeline({
        namespace: options.namespace,
        description,
        version: description.version,
        allEntityFields,
        debugMode,
      }),
    },
  };

  logger.debug(`Attempting to create pipeline: ${JSON.stringify(pipeline)}`);

  await esClient.ingest.putPipeline(pipeline);
};

export const deletePlatformPipeline = ({
  description,
  logger,
  esClient,
}: {
  description: EntityEngineInstallationDescriptor;
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const pipelineId = getPlatformPipelineId(description.id);
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

export const getPlatformPipelineStatus = async ({
  engineId,
  esClient,
}: {
  engineId: string;
  esClient: ElasticsearchClient;
}) => {
  const pipelineId = getPlatformPipelineId(engineId);
  const pipeline = await esClient.ingest.getPipeline(
    {
      id: pipelineId,
    },
    {
      ignore: [404],
    }
  );

  return {
    id: pipelineId,
    installed: !!pipeline[pipelineId],
    resource: EngineComponentResourceEnum.ingest_pipeline,
  };
};
