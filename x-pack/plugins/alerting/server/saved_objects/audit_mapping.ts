/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const auditMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    timestamp: {
      type: 'date',
    },
    operation: {
      type: 'keyword',
    },
    user: {
      type: 'keyword',
    },
    subject: {
      type: 'keyword',
    },
    subjectId: {
      type: 'keyword',
    },
  },
};
