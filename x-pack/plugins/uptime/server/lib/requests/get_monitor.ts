/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';
import { SyntheticsMonitor } from '../../../common/runtime_types';
import { syntheticsMonitor } from '../../lib/saved_objects/synthetics_monitor';

export const getSyntheticsMonitor = async ({
  monitorId,
  encryptedClient,
}: {
  monitorId: string;
  encryptedClient: EncryptedSavedObjectsClient;
}): Promise<SavedObject<SyntheticsMonitor>> => {
  try {
    return await encryptedClient.getDecryptedAsInternalUser<SyntheticsMonitor>(
      syntheticsMonitor.name,
      monitorId
    );
  } catch (e) {
    throw e;
  }
};
