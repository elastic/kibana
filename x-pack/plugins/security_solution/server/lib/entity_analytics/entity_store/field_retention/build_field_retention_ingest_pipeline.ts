/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldRetentionDefinition } from './field_retention_definitions';
import { getIdentityFieldForEntityType } from '../utils/utils';
import {
  arrayToSingleValueStep,
  debugDeepCopyContextStep,
  getDotExpanderSteps,
  getRemoveEmptyFieldSteps,
  removeEntityDefinitionFieldsStep,
  retentionDefinitionToIngestProcessorSteps,
} from './ingest_processor_steps';

const ENRICH_FIELD = 'historical';
const DEBUG_MODE = true; // TODO: do not commit this value

export const buildFieldRetentionIngestPipeline = ({
  fieldRetentionDefinition,
  enrichPolicyName,
  allEntityFields,
}: {
  fieldRetentionDefinition: FieldRetentionDefinition;
  enrichPolicyName: string;
  allEntityFields: string[];
}): IngestProcessorContainer[] => [
  ...(DEBUG_MODE ? [debugDeepCopyContextStep()] : []),
  {
    enrich: {
      policy_name: enrichPolicyName,
      field: fieldRetentionDefinition.matchField,
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
      value: `{{${getIdentityFieldForEntityType(fieldRetentionDefinition.entityType)}}}`,
    },
  },
  arrayToSingleValueStep({
    field: `${fieldRetentionDefinition.entityType}.risk.calculated_level`,
  }),
  arrayToSingleValueStep({
    field: 'asset.criticality',
  }),
  ...getDotExpanderSteps(allEntityFields),
  ...retentionDefinitionToIngestProcessorSteps(fieldRetentionDefinition),
  ...getRemoveEmptyFieldSteps([...allEntityFields, 'asset', 'risk']),
  removeEntityDefinitionFieldsStep(),
  ...(!DEBUG_MODE
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
