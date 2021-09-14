/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../../../../src/core/server';
import { Alerting } from '../deletion_migration/types';
import { EncryptedSavedObjectsClient } from '../../../../../../encrypted_saved_objects/server';

export interface DecryptApiKeyOptions {
  id: string;
  logger: Logger;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
}

export type DecryptApiKeyReturn =
  | {
      keyId: string;
      apiKey: string;
      apiKeyOwner: string;
    }
  | undefined;

export const decryptAPIKey = async ({
  id,
  encryptedSavedObjectsClient,
  logger,
}: DecryptApiKeyOptions): Promise<DecryptApiKeyReturn> => {
  const decrypted = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<Alerting>(
    'alert',
    id
  );
  const apiKeyDecrypted = decrypted.attributes.apiKey;
  const apiKeyOwner = decrypted.attributes.apiKeyOwner;
  if (apiKeyDecrypted == null || apiKeyOwner == null) {
    logger.error(
      [
        'API Key could not be decrypted.',
        'Could not update legacy actions to newer actions.',
        'Please check the existing "security_solution" actions to ensure their action intervals are set correctly as migrations have failed',
      ].join(' ')
    );
    return undefined;
  } else {
    const stringAPIKey = Buffer.from(apiKeyDecrypted, 'base64').toString('utf-8');
    const split = stringAPIKey.split(':');
    if (split.length !== 2) {
      logger.error(
        [
          `API Key could not be decrypted because the expected length after decryption was ${stringAPIKey.length} instead of 2.`,
          'Please check the existing "security_solution" actions to ensure their action intervals are set correctly as migrations have failed',
        ].join(' ')
      );
      return undefined;
    } else {
      const [keyId, apiKey] = split;
      return {
        keyId,
        apiKey,
        apiKeyOwner,
      };
    }
  }
};
