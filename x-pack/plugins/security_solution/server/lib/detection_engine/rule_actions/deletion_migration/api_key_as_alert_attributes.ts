/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../../../../src/core/server';
import { EncryptedSavedObjectsClient } from '../../../../../../encrypted_saved_objects/server';
import { decryptAPIKey } from './decrypt_api_key';

export interface ApiKeyAsAlertAttributesOptions {
  id: string;
  logger: Logger;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
}

export type ApiKeyAsAlertAttributesReturn =
  | {
      apiKey: string;
      apiKeyOwner: string;
    }
  | undefined;

export const apiKeyAsAlertAttributes = async ({
  id,
  encryptedSavedObjectsClient,
  logger,
}: ApiKeyAsAlertAttributesOptions): Promise<ApiKeyAsAlertAttributesReturn> => {
  const decrypted = await decryptAPIKey({
    logger,
    id,
    encryptedSavedObjectsClient,
  });
  if (decrypted == null) {
    return undefined;
  } else {
    return {
      apiKeyOwner: decrypted.apiKeyOwner,
      apiKey: Buffer.from(`${decrypted.keyId}:${decrypted.apiKey}`).toString('base64'),
    };
  }
};
