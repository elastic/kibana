/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldRetentionDefinition } from './field_retention_definitions';
import { getIdentityFieldForEntityType } from '../utils';
import {
  debugDeepCopyContextStep,
  getDotExpanderSteps,
  getRemoveEmptyFieldSteps,
  removeEntityDefinitionFieldsStep,
  retentionDefinitionToIngestProcessorSteps,
} from './ingest_processor_steps';

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
export const buildFieldRetentionIngestPipeline = ({
  fieldRetentionDefinition,
  enrichPolicyName,
  allEntityFields,
  debugMode,
}: {
  fieldRetentionDefinition: FieldRetentionDefinition;
  enrichPolicyName: string;
  allEntityFields: string[];
  debugMode?: boolean;
}): IngestProcessorContainer[] => {
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
