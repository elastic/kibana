/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsClientContract } from 'kibana/server';
import { SyntheticsMonitor } from '../../../common/runtime_types';
import { syntheticsMonitorType } from '../../lib/saved_objects/synthetics_monitor';

export const getSyntheticsMonitor = async ({
  monitorId,
  savedObjectsClient,
}: {
  monitorId: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObject<SyntheticsMonitor>> => {
  try {
    return await savedObjectsClient.get(syntheticsMonitorType, monitorId);
  } catch (e) {
    throw e;
  }
};
