/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES } from '../../shared_imports';

export const schema = {
  policy_id: {
    type: FIELD_TYPES.SELECT,
    label: 'Policy',
  },
  name: {
    type: FIELD_TYPES.TEXT,
    label: 'Name',
  },
  description: {
    type: FIELD_TYPES.TEXT,
    label: 'Description',
  },
  streams: {
    type: FIELD_TYPES.MULTI_SELECT,
  },
};
