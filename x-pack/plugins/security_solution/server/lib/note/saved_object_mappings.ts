/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

export const noteSavedObjectType = 'siem-ui-timeline-note';

export const noteSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    timelineId: {
      type: 'keyword',
    },
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

export const type: SavedObjectsType = {
  name: noteSavedObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: noteSavedObjectMappings,
};
