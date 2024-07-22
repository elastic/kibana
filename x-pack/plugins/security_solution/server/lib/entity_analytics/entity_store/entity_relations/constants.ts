/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/alerts-as-data-utils';

export const entityRelationsFieldMap: FieldMap = {
  entity_type: {
    type: 'keyword',
    array: false,
    required: true,
  },
  relation: {
    type: 'keyword',
    array: false,
    required: true,
  },
  entity: {
    type: 'object',
    properties: {
      name: {
        type: 'keyword',
      },
    },
    array: false,
    required: true,
  },
  related_entity: {
    type: 'object',
    properties: {
      name: {
        type: 'text',
      },
      id: {
        type: 'keyword',
      },
    },
    array: false,
    required: true,
  },
} as const;
