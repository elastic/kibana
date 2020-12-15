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
      index: false,
    },
    version: {
      type: 'long',
    },
    error: {
      type: 'text',
      index: false,
    },
    taskId: {
      type: 'keyword',
      index: false,
    },
    status: {
      type: 'keyword',
      index: false,
    },
    created: {
      type: 'date',
      index: false,
    },
    createdBy: {
      type: 'text',
      index: false,
    },
    updated: {
      type: 'date',
      index: false,
    },
    updatedBy: {
      type: 'text',
      index: false,
    },
  },
};

export const type: SavedObjectsType = {
  name: signalsMigrationType,
  hidden: false,
  namespaceType: 'single',
  mappings: signalsMigrationMappings,
};
