/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';

export const SpacesSavedObjectMappings = deepFreeze({
  dynamic: false as false,
  properties: {
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 2048,
        },
      },
    },
    solution: {
      type: 'keyword',
    },
  },
} as const);

export const UsageStatsMappings = deepFreeze({
  dynamic: false as false, // we aren't querying or aggregating over this data, so we don't need to specify any fields
  properties: {},
});
