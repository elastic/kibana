/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectReference,
  SavedObjectUnsanitizedDoc,
} from '../../../../../../../src/core/server';
import { InfraSourceConfiguration } from '../../../../common/source_configuration/source_configuration';
import { infraSourceConfigurationSavedObjectName } from '../saved_object_type';

export const createTestSourceConfiguration = (
  overrideAttributes: Partial<InfraSourceConfiguration> = {},
  initialReferences: SavedObjectReference[] = []
): SavedObjectUnsanitizedDoc<InfraSourceConfiguration> => ({
  attributes: {
    name: 'TEST CONFIGURATION',
    description: '',
    fields: {
      pod: 'TEST POD FIELD',
      host: 'TEST HOST FIELD',
      message: ['TEST MESSAGE FIELD'],
      container: 'TEST CONTAINER FIELD',
      timestamp: 'TEST TIMESTAMP FIELD',
      tiebreaker: 'TEST TIEBREAKER FIELD',
    },
    inventoryDefaultView: '0',
    metricsExplorerDefaultView: '0',
    logColumns: [
      {
        fieldColumn: {
          id: 'TEST FIELD COLUMN ID',
          field: 'TEST FIELD COLUMN FIELD',
        },
      },
    ],
    logIndices: {
      type: 'index_name',
      indexName: 'TEST INDEX',
    },
    metricAlias: 'metricbeat-*,metrics-*',
    anomalyThreshold: 20,
    ...overrideAttributes,
  },
  id: 'TEST_ID',
  type: infraSourceConfigurationSavedObjectName,
  references: initialReferences,
});
