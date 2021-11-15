/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, SavedObjectsClientContract, SavedObjectsFindResponse } from 'kibana/server';
import { uptimeMonitorType } from '../saved_objects';
import { MonitorSavedObject } from '../../../common/types';

export const getMonitors = async ({
  savedObjectsClient,
  core,
}: {
  savedObjectsClient?: SavedObjectsClientContract;
  core?: CoreStart;
}) => {
  let monitorsSavedObjects: SavedObjectsFindResponse<MonitorSavedObject>;

  if (savedObjectsClient) {
    monitorsSavedObjects = await savedObjectsClient.find<MonitorSavedObject>({
      type: uptimeMonitorType,
    });
  } else {
    monitorsSavedObjects = await core!.savedObjects
      .createInternalRepository()
      .find({ type: uptimeMonitorType });
  }
  const savedObjectsList = monitorsSavedObjects.saved_objects;
  const result = savedObjectsList.map(({ attributes, id }) => ({
    ...attributes,
    id,
    fields: [{ sourceId: id }],
  }));
  for (let i = 0; i < result.length; i++) {
    const monitor = result[i];
    if (monitor.runOnce) {
      if (savedObjectsClient) {
        await savedObjectsClient.delete(uptimeMonitorType, monitor.id);
      } else {
        await core!.savedObjects.createInternalRepository().delete(uptimeMonitorType, monitor.id);
      }
    }
  }

  return result;
};
