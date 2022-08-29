/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
} from 'node:crypto';

import { ISavedObjectsRepository, SavedObjectsClient } from '@kbn/core/server';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';

import { ConnectorConfiguration } from '../../../common/types/connectors';
import { isEncryptedConfigurationEntry } from '../../../common/utils/is_encrypted_configuration_entry';

import {
  ConnectorsEncryptionKey,
  CONNECTORS_ENCRYPTION_KEY_TYPE,
} from '../../saved_objects/enterprise_search/connectors_encryption_key';

export const fetchConnectorEncryptionKey = async (
  client: ISavedObjectsRepository | SavedObjectsClient,
  encryptedClient: EncryptedSavedObjectsClient
): Promise<ConnectorsEncryptionKey | undefined> => {
  const savedObjectsResponse = await client.find<ConnectorsEncryptionKey>({
    type: CONNECTORS_ENCRYPTION_KEY_TYPE,
  });
  if (!savedObjectsResponse.saved_objects[0]) {
    return undefined;
  }
  try {
    const secret = await encryptedClient.getDecryptedAsInternalUser<{
      private_key: string;
    }>(CONNECTORS_ENCRYPTION_KEY_TYPE, savedObjectsResponse.saved_objects[0].id);
    return {
      ...savedObjectsResponse.saved_objects[0].attributes,
      private_key: secret.attributes.private_key,
    };
  } catch {
    return savedObjectsResponse.saved_objects[0].attributes;
  }
};

export const fetchSharedEncryptionKey = async (
  client: ISavedObjectsRepository | SavedObjectsClient,
  encryptedClient: EncryptedSavedObjectsClient,
  opposingPublicKey: string
): Promise<Buffer | undefined> => {
  try {
    const encryptionKeys = await fetchConnectorEncryptionKey(client, encryptedClient);
    if (encryptionKeys) {
      const privateKey = createPrivateKey(encryptionKeys.private_key);
      const publicKey = createPublicKey(opposingPublicKey);
      return diffieHellman({ privateKey, publicKey });
    }
    return undefined;
  } catch {
    return undefined;
  }
};

export const decryptValue = async (
  value: string,
  secret: Buffer,
  initializationVector: string
): Promise<string | undefined> => {
  try {
    const cipher = createDecipheriv(
      'aes-256-cbc',
      secret,
      Buffer.from(initializationVector, 'hex')
    );
    const decryptedValue = cipher.update(value, 'hex', 'utf8');
    const decrypted = decryptedValue + cipher.final('utf8');
    return decrypted;
  } catch (error) {
    return undefined;
  }
};

export const encryptValue = async (
  value: string,
  secret: Buffer,
  initializationVector: string
): Promise<string> => {
  try {
    const cipher = createCipheriv('aes-256-cbc', secret, Buffer.from(initializationVector, 'hex'));
    const encryptedValue = cipher.update(value, 'utf8', 'hex');
    const encrypted = encryptedValue + cipher.final('hex');
    return encrypted;
  } catch (error) {
    return '';
  }
};

export async function encryptConfiguration(
  configuration: ConnectorConfiguration,
  secret: Buffer,
  initializationVector: string
): Promise<ConnectorConfiguration> {
  const configArray = await Promise.all(
    Object.entries(configuration).map(async ([key, configEntry]) => {
      const encryptedValue = await encryptValue(
        configEntry?.value ?? '',
        secret,
        initializationVector
      );
      return configEntry
        ? {
            ...configEntry,
            key,
            value: encryptedValue,
          }
        : undefined;
    })
  );
  return configArray.reduce(
    (acc, curr) =>
      curr
        ? {
            ...acc,
            [curr.key]: { label: curr.label, value: curr.value },
          }
        : acc,
    {}
  );
}

export async function decryptConfiguration(
  configuration: ConnectorConfiguration,
  secret: Buffer
): Promise<ConnectorConfiguration> {
  const configArray = await Promise.all(
    Object.entries(configuration).map(async ([key, configEntry]) => {
      if (configEntry && isEncryptedConfigurationEntry(configEntry)) {
        const decryptedValue = await decryptValue(
          configEntry.value,
          secret,
          configEntry.initialization_vector ?? ''
        );
        return {
          ...configEntry,
          key,
          value: decryptedValue,
        };
      }
      return configEntry
        ? {
            key,
            ...configEntry,
          }
        : undefined;
    })
  );
  return configArray.reduce(
    (acc, curr) => (curr ? { ...acc, [curr.key]: { label: curr.label, value: curr.value } } : acc),
    {}
  );
}
