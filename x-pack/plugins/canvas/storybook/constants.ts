/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

export const KIBANA_ROOT = path.resolve(__dirname, '../../../..');

export const argTypes = {
  hasTemplates: {
    name: 'Has templates?',
    type: {
      name: 'boolean',
    },
    defaultValue: true,
    control: {
      type: 'boolean',
    },
  },
  useStaticData: {
    name: 'Use static data?',
    type: {
      name: 'boolean',
    },
    defaultValue: false,
    control: {
      type: 'boolean',
    },
  },
  workpadCount: {
    name: 'Number of workpads',
    type: { name: 'number' },
    defaultValue: 5,
    control: {
      type: 'range',
    },
  },
};
