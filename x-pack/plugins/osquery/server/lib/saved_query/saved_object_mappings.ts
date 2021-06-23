/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

import { savedQuerySavedObjectType, packSavedObjectType } from '../../../common/types';

export const savedQuerySavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    description: {
      type: 'text',
    },
    name: {
      type: 'text',
    },
    query: {
      type: 'text',
    },
    created: {
      type: 'date',
    },
    createdBy: {
      type: 'text',
    },
    platform: {
      type: 'keyword',
    },
    updated: {
      type: 'date',
    },
    updatedBy: {
      type: 'text',
    },
  },
};

export const savedQueryType: SavedObjectsType = {
  name: savedQuerySavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: savedQuerySavedObjectMappings,
};

export const packSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    description: {
      type: 'text',
    },
    name: {
      type: 'text',
    },
    created: {
      type: 'date',
    },
    createdBy: {
      type: 'text',
    },
    updated: {
      type: 'date',
    },
    updatedBy: {
      type: 'text',
    },
    queries: {
      properties: {
        name: {
          type: 'keyword',
        },
        interval: {
          type: 'text',
        },
      },
    },
  },
};

export const packType: SavedObjectsType = {
  name: packSavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: packSavedObjectMappings,
};
