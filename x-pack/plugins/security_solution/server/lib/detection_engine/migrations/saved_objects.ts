/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

export const signalsMigrationType = 'security-solution-signals-migration';

export const signalsMigrationMappings: SavedObjectsType['mappings'] = {
  properties: {
    sourceIndex: {
      type: 'keyword',
    },
    destinationIndex: {
      type: 'keyword',
    },
    version: {
      type: 'long',
    },
    error: {
      type: 'text',
    },
    taskId: {
      type: 'keyword',
    },
    status: {
      type: 'keyword',
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
  name: signalsMigrationType,
  hidden: false,
  namespaceType: 'single',
  mappings: signalsMigrationMappings,
};
