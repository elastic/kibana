/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMap } from '@kbn/data-stream-adapter';

export const assistantAnonymizationFieldsFieldMap: FieldMap = {
  '@timestamp': {
    type: 'date',
    array: false,
    required: false,
  },
  id: {
    type: 'keyword',
    array: false,
    required: true,
  },
  field: {
    type: 'keyword',
    array: false,
    required: false,
  },
  default_allow: {
    type: 'boolean',
    array: false,
    required: false,
  },
  default_allow_replacement: {
    type: 'boolean',
    array: false,
    required: false,
  },
  updated_at: {
    type: 'date',
    array: false,
    required: false,
  },
  updated_by: {
    type: 'keyword',
    array: false,
    required: false,
  },
  created_at: {
    type: 'date',
    array: false,
    required: false,
  },
  created_by: {
    type: 'keyword',
    array: false,
    required: false,
  },
  users: {
    type: 'nested',
    array: true,
    required: false,
  },
  'users.id': {
    type: 'keyword',
    array: false,
    required: false,
  },
  'users.name': {
    type: 'keyword',
    array: false,
    required: false,
  },
};
