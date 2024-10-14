/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * This function creates an ingest processor step that removes entity definition fields which
 * are not ECS.
 */
export const removeEntityDefinitionFieldsStep = (): IngestProcessorContainer => ({
  remove: {
    ignore_failure: true,
    field: [
      'entity.lastSeenTimestamp',
      'entity.schemaVersion',
      'entity.definitionVersion',
      'entity.identityFields',
      'entity.definitionId',
      'entity.displayName',
      'entity.firstSeenTimestamp',
    ],
  },
});
