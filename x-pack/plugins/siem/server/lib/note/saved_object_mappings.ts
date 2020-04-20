/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const noteSavedObjectType = 'siem-ui-timeline-note';

export const noteSavedObjectMappings = {
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
