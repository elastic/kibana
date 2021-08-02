/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from 'kibana/server';
import type { SavedObjectsServiceSetup } from 'kibana/server';

const SCHEDULED_REPORTS_SAVED_OBJECT_TYPE = 'scheduled-report';

const scheduledReportSavedObjectType: SavedObjectsType = {
  name: SCHEDULED_REPORTS_SAVED_OBJECT_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      task_id: { type: 'keyword' },
      jobtype: { type: 'keyword' },
      scheduled_at: { type: 'date' },
      scheduled_by: { type: 'keyword' },
      payload: { type: 'object', enabled: false }, // includes title and timezone
      migration_version: { type: 'keyword' },
      schedule: {
        properties: {
          interval: { type: 'keyword' },
          last_completed: { type: 'date' },
        },
      },
    },
  },
};

export const setupScheduledReportSavedObjects = (savedObjects: SavedObjectsServiceSetup) => {
  savedObjects.registerType(scheduledReportSavedObjectType);
};
