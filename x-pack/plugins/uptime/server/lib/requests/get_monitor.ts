/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import {
  SyntheticsMonitorWithSecrets,
  EncryptedSyntheticsMonitor,
} from '../../../common/runtime_types';
import { syntheticsMonitor, syntheticsMonitorType } from '../saved_objects/synthetics_monitor';

export const getSyntheticsMonitor = async ({
  monitorId,
  encryptedSavedObjectsClient,
  savedObjectsClient,
}: {
  monitorId: string;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObject<SyntheticsMonitorWithSecrets>> => {
  try {
    const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitor>(
      syntheticsMonitorType,
      monitorId
    );

    return await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
      syntheticsMonitor.name,
      monitorId,
      {
        namespace: encryptedMonitor.namespaces?.[0],
      }
    );
  } catch (e) {
    throw e;
  }
};
