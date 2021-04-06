/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { FIELD_TYPES } from '../../shared_imports';

export const defaultValue = {
  name: '',
  description: '',
  namespace: 'default',
  enabled: true,
  policy_id: '',
  output_id: '',
  package: {
    name: OSQUERY_INTEGRATION_NAME,
    title: 'Osquery Manager',
    version: '0.1.0',
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
