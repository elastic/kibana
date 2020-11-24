/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deepFreeze } from '@kbn/std';

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

export const UsageStatsMappings = deepFreeze({
  properties: {
    apiCalls: {
      type: 'object',
      properties: {
        copySavedObjects: {
          type: 'object',
          properties: {
            total: { type: 'long' },
            createNewCopiesEnabled: {
              type: 'object',
              properties: {
                yes: { type: 'long' },
                no: { type: 'long' },
              },
            },
            overwriteEnabled: {
              type: 'object',
              properties: {
                yes: { type: 'long' },
                no: { type: 'long' },
              },
            },
          },
        },
        resolveCopySavedObjectsErrors: {
          type: 'object',
          properties: {
            total: { type: 'long' },
            createNewCopiesEnabled: {
              type: 'object',
              properties: {
                yes: { type: 'long' },
                no: { type: 'long' },
              },
            },
          },
        },
      },
    },
  },
});
