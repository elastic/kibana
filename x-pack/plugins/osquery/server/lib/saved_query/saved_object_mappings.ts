/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

export const savedQuerySavedObjectType = 'osquery-saved-query';

export const savedQuerySavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    description: {
      type: 'text',
    },
    title: {
      type: 'text',
    },
    command: {
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
  },
};

export const type: SavedObjectsType = {
  name: savedQuerySavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: savedQuerySavedObjectMappings,
};
