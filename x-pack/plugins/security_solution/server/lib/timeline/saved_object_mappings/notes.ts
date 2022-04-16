/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { notesMigrations } from './migrations/notes';

export const noteSavedObjectType = 'siem-ui-timeline-note';

export const noteSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    eventId: {
      type: 'keyword',
    },
    note: {
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

export const noteType: SavedObjectsType = {
  name: noteSavedObjectType,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: noteSavedObjectMappings,
  migrations: notesMigrations,
};
