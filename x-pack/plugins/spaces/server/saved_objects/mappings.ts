/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deepFreeze } from '../../../../../src/core/server';

export const SpacesSavedObjectMappings = deepFreeze({
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
    description: {
      type: 'text',
    },
    initials: {
      type: 'keyword',
    },
    color: {
      type: 'keyword',
    },
    disabledFeatures: {
      type: 'keyword',
    },
    imageUrl: {
      type: 'text',
      index: false,
    },
    _reserved: {
      type: 'boolean',
    },
  },
});
