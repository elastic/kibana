/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../common/constants';
import { DynamicSettings, SyntheticsServiceApiKey } from '../../common/runtime_types';
import {
  SavedObjectsType,
  SavedObjectsErrorHelpers,
  SavedObjectsClientContract,
  ISavedObjectsRepository,
} from '../../../../../src/core/server';

export const settingsObjectType = 'uptime-dynamic-settings';
export const uptimeMonitorType = 'uptime-monitor';
export const settingsObjectId = 'uptime-dynamic-settings-singleton';
export const syntheticsApiKeyObjectType = 'uptime-synthetics-api-key';
export const syntheticsApiKeyID = 'uptime-synthetics-api-key-singleton';

export const umDynamicSettings: SavedObjectsType = {
  name: settingsObjectType,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      heartbeatIndices: {
        type: 'keyword',
      },
      certAgeThreshold: {
        type: 'long',
      },
      certExpirationThreshold: {
        type: 'long',
      },
      defaultConnectors: {
        type: 'keyword',
      },
      */
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.uptime.uptimeSettings.index', {
        defaultMessage: 'Uptime Settings - Index',
      }),
  },
};

export const syntheticsServiceApiKey: SavedObjectsType = {
  name: syntheticsApiKeyObjectType,
  hidden: true,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      /* Leaving these commented to make it clear that these fields exist, even though we don't want them indexed.
         When adding new fields please add them here. If they need to be searchable put them in the uncommented
         part of properties.
      heartbeatIndices: {
        type: 'keyword',
      },
      certAgeThreshold: {
        type: 'long',
      },
      certExpirationThreshold: {
        type: 'long',
      },
      defaultConnectors: {
        type: 'keyword',
      },
      */
    },
  },
  management: {
    importableAndExportable: false,
    icon: 'uptimeApp',
    getTitle: () =>
      i18n.translate('xpack.uptime.uptimeSettings.index', {
        defaultMessage: 'Synthetics service api key',
      }),
  },
};

export const uptimeMonitor: SavedObjectsType = {
  name: uptimeMonitorType,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'keyword',
      },
      id: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
      schedule: {
        type: 'keyword',
      },
    },
  },
  management: {
    importableAndExportable: true,
    icon: 'uptimeApp',
    getTitle: (savedObject) =>
      savedObject.attributes.name +
      ' - ' +
      i18n.translate('xpack.uptime.uptimeSettings.index', {
        defaultMessage: 'Uptime - Monitor',
      }),
  },
};

type Client = SavedObjectsClientContract | ISavedObjectsRepository;

export const savedObjectsAdapter = {
  config: null,
  getUptimeDynamicSettings: async (client: Client): Promise<DynamicSettings> => {
    try {
      const obj = await client.get<DynamicSettings>(umDynamicSettings.name, settingsObjectId);
      return obj?.attributes ?? DYNAMIC_SETTINGS_DEFAULTS;
    } catch (getErr) {
      const config = savedObjectsAdapter.config;
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        if (config?.index) {
          return { ...DYNAMIC_SETTINGS_DEFAULTS, heartbeatIndices: config.index };
        }
        return DYNAMIC_SETTINGS_DEFAULTS;
      }
      throw getErr;
    }
  },
  setUptimeDynamicSettings: async (client: Client, settings): Promise<void> => {
    await client.create(umDynamicSettings.name, settings, {
      id: settingsObjectId,
      overwrite: true,
    });
  },
  getSyntheticsServiceApiKey: async (client: Client): Promise<SyntheticsServiceApiKey> => {
    try {
      const obj = await client.get<SyntheticsServiceApiKey>(
        syntheticsServiceApiKey.name,
        syntheticsApiKeyID
      );
      return obj?.attributes;
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        // TO DO: surface a UI error that Synthetics service is not able to be enabled
      } else {
        throw getErr;
      }
    }
  },
  setSyntheticsServiceApiKey: async (
    client: Client,
    apiKey: SyntheticsServiceApiKey
  ): Promise<void> => {
    await client.create(syntheticsServiceApiKey.name, apiKey, {
      id: syntheticsApiKeyID,
      overwrite: true,
    });
  },
};
