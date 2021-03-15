/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES, FormSchema } from '../../shared_imports';

export const formSchema: FormSchema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: 'Query name',
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: 'Description',
    validations: [],
  },
  platform: {
    type: FIELD_TYPES.SELECT,
    label: 'Platform',
    defaultValue: 'all',
  },
  query: {
    label: 'Query',
    type: FIELD_TYPES.TEXTAREA,
    validations: [],
  },
};
