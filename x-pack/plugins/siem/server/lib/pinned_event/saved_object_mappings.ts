/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const pinnedEventSavedObjectType = 'siem-ui-timeline-pinned-event';

export const pinnedEventSavedObjectMappings = {
  properties: {
    timelineId: {
      type: 'keyword',
    },
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
