/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const assistantAnonimizationFieldsTypeName = 'elastic-ai-assistant-anonimization-fields';

export const assistantAnonimizationFieldsTypeMappings: SavedObjectsType['mappings'] = {
  properties: {
    fieldId: {
      type: 'keyword',
    },
    defaultAllow: {
      type: 'boolean',
    },
    defaultAllowReplacement: {
      type: 'boolean',
    },
    updated_at: {
      type: 'keyword',
    },
    updated_by: {
      type: 'keyword',
    },
    created_at: {
      type: 'keyword',
    },
    created_by: {
      type: 'keyword',
    },
  },
};

export const assistantAnonimizationFieldsType: SavedObjectsType = {
  name: assistantAnonimizationFieldsTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: assistantAnonimizationFieldsTypeMappings,
};
