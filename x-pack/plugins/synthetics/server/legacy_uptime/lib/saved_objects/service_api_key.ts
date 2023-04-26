/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsType,
} from '@kbn/core/server';
import { SyntheticsServiceApiKey } from '../../../../common/runtime_types/synthetics_service_api_key';
import { UptimeServerSetup } from '../adapters';

export const syntheticsApiKeyID = 'ba997842-b0cf-4429-aa9d-578d9bf0d391';
export const syntheticsApiKeyObjectType = 'uptime-synthetics-api-key';

export const syntheticsServiceApiKey: SavedObjectsType = {
  name: syntheticsApiKeyObjectType,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary',
      },
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      id: {
        type: 'keyword',
      },
      name: {
        type: 'long',
      },
      */
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.synthetics.synthetics.service.apiKey', {
        defaultMessage: 'Synthetics service api key',
      }),
  },
};

const getEncryptedSOClient = (server: UptimeServerSetup) => {
  const encryptedClient = server.encryptedSavedObjects.getClient({
    includedHiddenTypes: [syntheticsServiceApiKey.name],
  });
  return encryptedClient;
};

const getSyntheticsServiceAPIKey = async (server: UptimeServerSetup) => {
  try {
    const soClient = getEncryptedSOClient(server);
    const obj = await soClient.getDecryptedAsInternalUser<SyntheticsServiceApiKey>(
      syntheticsServiceApiKey.name,
      syntheticsApiKeyID
    );
    return obj?.attributes;
  } catch (getErr) {
    if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
      return undefined;
    }
    throw getErr;
  }
};

export const setSyntheticsServiceApiKey = async (
  soClient: SavedObjectsClientContract,
  apiKey: SyntheticsServiceApiKey
) => {
  await soClient.create(syntheticsServiceApiKey.name, apiKey, {
    id: syntheticsApiKeyID,
    overwrite: true,
  });
};

const deleteSyntheticsServiceApiKey = async (soClient: SavedObjectsClientContract) => {
  try {
    return await soClient.delete(syntheticsServiceApiKey.name, syntheticsApiKeyID);
  } catch (e) {
    throw e;
  }
};

export const syntheticsServiceAPIKeySavedObject = {
  get: getSyntheticsServiceAPIKey,
  set: setSyntheticsServiceApiKey,
  delete: deleteSyntheticsServiceApiKey,
};
