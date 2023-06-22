/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { pinnedEventsMigrations } from './migrations/pinned_events';

export const pinnedEventSavedObjectType = 'siem-ui-timeline-pinned-event';

export const pinnedEventSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    eventId: {
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

export const pinnedEventType: SavedObjectsType = {
  name: pinnedEventSavedObjectType,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: pinnedEventSavedObjectMappings,
  migrations: pinnedEventsMigrations,
};
