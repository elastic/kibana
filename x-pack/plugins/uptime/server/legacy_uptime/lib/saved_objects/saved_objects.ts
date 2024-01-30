/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
  SavedObjectsServiceSetup,
} from '@kbn/core/server';

import { DYNAMIC_SETTINGS_DEFAULT_ATTRIBUTES } from '../../../constants/settings';
import { DynamicSettingsAttributes } from '../../../runtime_types/settings';
import { UMSavedObjectsQueryFn } from '../adapters';
import { UptimeConfig } from '../../../../common/config';
import { settingsObjectId, umDynamicSettings } from './uptime_settings';

export const registerUptimeSavedObjects = (savedObjectsService: SavedObjectsServiceSetup) => {
  savedObjectsService.registerType(umDynamicSettings);
};

export interface UMSavedObjectsAdapter {
  config: UptimeConfig | null;
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettingsAttributes>;
  setUptimeDynamicSettings: (
    client: SavedObjectsClientContract,
    attr: DynamicSettingsAttributes
  ) => Promise<DynamicSettingsAttributes>;
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
  setUptimeDynamicSettings: async (client, settings: DynamicSettingsAttributes) => {
    const newObj = await client.create<DynamicSettingsAttributes>(
      umDynamicSettings.name,
      settings,
      {
        id: settingsObjectId,
        overwrite: true,
      }
    );
    return newObj.attributes;
  },
};
