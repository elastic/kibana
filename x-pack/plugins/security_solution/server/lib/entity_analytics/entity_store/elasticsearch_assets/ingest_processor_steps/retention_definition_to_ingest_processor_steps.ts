/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  FieldRetentionDefinition,
  FieldRetentionOperatorBuilderOptions,
} from '../../field_retention_definition';
import { fieldOperatorToIngestProcessor } from '../../field_retention_definition';

/**
 * Converts a field retention definition to the ingest processor steps
 * required to apply the field retention policy.
 */
export const retentionDefinitionToIngestProcessorSteps = (
  fieldRetentionDefinition: FieldRetentionDefinition,
  options: FieldRetentionOperatorBuilderOptions
): IngestProcessorContainer[] => {
  return fieldRetentionDefinition.fields.map((field) =>
    fieldOperatorToIngestProcessor(field, options)
  );
};
