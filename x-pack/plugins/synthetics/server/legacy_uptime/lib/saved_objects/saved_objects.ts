/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers, SavedObjectsServiceSetup } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginSetup } from '@kbn/encrypted-saved-objects-plugin/server';

import {
  SYNTHETICS_SECRET_ENCRYPTED_TYPE,
  syntheticsParamSavedObjectType,
} from './synthetics_param';
import { privateLocationsSavedObject } from './private_locations';
import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../../../constants/settings';
import { DynamicSettingsAttributes } from '../../../runtime_types/settings';
import { ConfigKey } from '../../../../common/runtime_types';
import { UMSavedObjectsQueryFn } from '../adapters';
import { UptimeConfig } from '../../../../common/config';
import { settingsObjectId, umDynamicSettings } from './uptime_settings';
import {
  getSyntheticsMonitorSavedObjectType,
  SYNTHETICS_MONITOR_ENCRYPTED_TYPE,
} from './synthetics_monitor';
import { syntheticsServiceApiKey } from './service_api_key';

export const registerUptimeSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup
) => {
  savedObjectsService.registerType(umDynamicSettings);
  savedObjectsService.registerType(privateLocationsSavedObject);

  savedObjectsService.registerType(getSyntheticsMonitorSavedObjectType(encryptedSavedObjects));
  savedObjectsService.registerType(syntheticsServiceApiKey);
  savedObjectsService.registerType(syntheticsParamSavedObjectType);

  encryptedSavedObjects.registerType({
    type: syntheticsServiceApiKey.name,
    attributesToEncrypt: new Set(['apiKey']),
    attributesToExcludeFromAAD: new Set([ConfigKey.ALERT_CONFIG]),
  });

  encryptedSavedObjects.registerType(SYNTHETICS_MONITOR_ENCRYPTED_TYPE);
  encryptedSavedObjects.registerType(SYNTHETICS_SECRET_ENCRYPTED_TYPE);
};

export interface UMSavedObjectsAdapter {
  config: UptimeConfig | null;
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettingsAttributes>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettingsAttributes>;
}

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  config: null,
  getUptimeDynamicSettings: async (client) => {
    try {
      const obj = await client.get<DynamicSettingsAttributes>(
        umDynamicSettings.name,
        settingsObjectId
      );
      return obj?.attributes ?? DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
    } catch (getErr) {
      const config = savedObjectsAdapter.config;
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        if (config?.index) {
          return { ...DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES, heartbeatIndices: config.index };
        }
        return DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES;
      }
      throw getErr;
    }
  },
  setUptimeDynamicSettings: async (client, settings: DynamicSettingsAttributes | undefined) => {
    await client.create(umDynamicSettings.name, settings, {
      id: settingsObjectId,
      overwrite: true,
    });
  },
};
