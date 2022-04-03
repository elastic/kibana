/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsErrorHelpers,
  SavedObjectsServiceSetup,
} from '../../../../../../src/core/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../../encrypted_saved_objects/server';

import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { secretKeys } from '../../../common/constants/monitor_management';
import { DynamicSettings } from '../../../common/runtime_types';
import { UMSavedObjectsQueryFn } from '../adapters';
import { UptimeConfig } from '../../../common/config';
import { settingsObjectId, umDynamicSettings } from './uptime_settings';
import { syntheticsMonitor } from './synthetics_monitor';
import { syntheticsServiceApiKey } from './service_api_key';

export const registerUptimeSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup,
  isServiceEnabled: boolean
) => {
  savedObjectsService.registerType(umDynamicSettings);

  if (isServiceEnabled) {
    savedObjectsService.registerType(syntheticsMonitor);
    savedObjectsService.registerType(syntheticsServiceApiKey);

    encryptedSavedObjects.registerType({
      type: syntheticsServiceApiKey.name,
      attributesToEncrypt: new Set(['apiKey']),
    });

    encryptedSavedObjects.registerType({
      type: syntheticsMonitor.name,
      attributesToEncrypt: new Set([
        'secrets',
        /* adding secretKeys to the list of attributes to encrypt ensures
         * that secrets are never stored on the resulting saved object,
         * even in the presence of developer error.
         *
         * In practice, all secrets should be stored as a single JSON
         * payload on the `secrets` key. This ensures performant decryption. */
        ...secretKeys,
      ]),
    });
  }
};

export interface UMSavedObjectsAdapter {
  config: UptimeConfig | null;
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettings>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettings>;
}

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  config: null,
  getUptimeDynamicSettings: async (client) => {
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
  setUptimeDynamicSettings: async (client, settings) => {
    await client.create(umDynamicSettings.name, settings, {
      id: settingsObjectId,
      overwrite: true,
    });
  },
};
