/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_TYPES } from '../../shared_imports';

export const defaultValue = {
  name: '',
  description: '',
  namespace: 'default',
  enabled: true,
  policy_id: '1e2bb670-686c-11eb-84b4-81282a213fcf',
  output_id: '',
  package: {
    name: 'osquery_elastic_managed',
    title: 'OSquery Elastic Managed',
    version: '0.1.2',
  },
  inputs: [
    {
      type: 'osquery',
      enabled: true,
      streams: [],
    },
  ],
};

export const schema = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: 'Name',
  },
  description: {
    type: FIELD_TYPES.TEXT,
    label: 'Description',
  },
  namespace: {
    type: FIELD_TYPES.TEXT,
  },
  enabled: {
    type: FIELD_TYPES.TOGGLE,
  },
  policy_id: {
    type: FIELD_TYPES.TEXT,
  },
  inputs: {
    enabled: {
      type: FIELD_TYPES.TOGGLE,
    },
    streams: {
      type: FIELD_TYPES.MULTI_SELECT,
      vars: {
        query: {
          type: {
            type: FIELD_TYPES.TEXT,
          },
          value: {
            type: FIELD_TYPES.TEXT,
          },
        },
      },
    },
  },
};
