/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { syntheticsMonitorType } from '../../common/types/saved_objects';
import {
  SyntheticsMonitorWithSecretsAttributes,
  EncryptedSyntheticsMonitorAttributes,
  SyntheticsMonitor,
} from '../../common/runtime_types';
import { normalizeSecrets } from '../synthetics_service/utils/secrets';

export const getSyntheticsMonitor = async ({
  monitorId,
  encryptedSavedObjectsClient,
  savedObjectsClient,
}: {
  monitorId: string;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SyntheticsMonitor> => {
  try {
    const encryptedMonitor = await savedObjectsClient.get<EncryptedSyntheticsMonitorAttributes>(
      syntheticsMonitorType,
      monitorId
    );

    const decryptedMonitor =
      await encryptedSavedObjectsClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        syntheticsMonitorType,
        monitorId,
        {
          namespace: encryptedMonitor.namespaces?.[0],
        }
      );
    const { attributes } = normalizeSecrets(decryptedMonitor);
    return attributes;
  } catch (e) {
    throw e;
  }
};
