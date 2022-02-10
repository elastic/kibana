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
} from '../../../../../../src/core/server';
import { SyntheticsServiceApiKey } from '../../../common/runtime_types/synthetics_service_api_key';
import { EncryptedSavedObjectsClient } from '../../../../encrypted_saved_objects/server';

export const syntheticsApiKeyID = 'ba997842-b0cf-4429-aa9d-578d9bf0d391';
export const syntheticsApiKeyObjectType = 'uptime-synthetics-api-key';

export const syntheticsServiceApiKey: SavedObjectsType = {
  name: syntheticsApiKeyObjectType,
  hidden: true,
  namespaceType: 'single',
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
      i18n.translate('xpack.uptime.synthetics.service.apiKey', {
        defaultMessage: 'Synthetics service api key',
      }),
  },
};

export const getSyntheticsServiceAPIKey = async (client: EncryptedSavedObjectsClient) => {
  try {
    const obj = await client.getDecryptedAsInternalUser<SyntheticsServiceApiKey>(
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
  client: SavedObjectsClientContract,
  apiKey: SyntheticsServiceApiKey
) => {
  await client.create(syntheticsServiceApiKey.name, apiKey, {
    id: syntheticsApiKeyID,
    overwrite: true,
  });
};
