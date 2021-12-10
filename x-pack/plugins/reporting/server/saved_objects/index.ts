/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceStart, SavedObjectsType } from 'kibana/server';
import { PLUGIN_ID } from '../../common/constants';

/*
 * The purpose of this saved object is to ensure that if Reporting is disabled in
 * a Kibana, it is disabled in every Kibana instance.
 *
 * Reporting creates this saved object as a safety check from instances that
 * have the Reporting plugin disabled. Those instances should fail to start up
 * since this saved object type isn't registered. The unknown type of object is
 * meant to cause Kibana to fail to start.
 *
 * If an administrator wishes to disable Reporting, they should use
 * `xpack.reporting.queue.pollEnabled: false` from simply stopping the
 * Reporting plugin from doing any processing work.
 *
 * If they wish to completely disable Reporting, but Reporting has been run on
 * a previous instance, they will have to manually remove this saved object
 * from the Kibana instance to clear the "unknown" object.
 */

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

    // Reporting creates the object to raise a flag in instances that have
    // disabled Reporting.
    await scopedClient.update<Attributes>(PLUGIN_ID, SAVED_OBJECT_ID, reportingStatus, {
      upsert: reportingStatus,
    });
  },
};
