/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceStart, SavedObjectsType } from 'kibana/server';
import { PLUGIN_ID } from '../../common/constants';

const SAVED_OBJECT_ID = 'reporting-status';

interface Attributes {
  enabled: true;
}

export const reportingStatusSavedObject = {
  get type() {
    const reportingStatusSavedObjectType: SavedObjectsType<Attributes> = {
      name: PLUGIN_ID,
      namespaceType: 'agnostic',
      hidden: true,
      mappings: {
        properties: {
          enabled: { type: 'boolean' },
        },
      },
    };
    return reportingStatusSavedObjectType;
  },

  async setStatus(savedObjects: SavedObjectsServiceStart) {
    const scopedClient = savedObjects.createInternalRepository([PLUGIN_ID]);
    const reportingStatus: Attributes = { enabled: true };
    await scopedClient.update<Attributes>(PLUGIN_ID, SAVED_OBJECT_ID, reportingStatus, {
      upsert: reportingStatus,
    });
  },
};
