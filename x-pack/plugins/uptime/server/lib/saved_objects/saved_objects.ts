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
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../common/constants';
import { DynamicSettings } from '../../../common/runtime_types';
import { UMSavedObjectsQueryFn } from '../adapters';
import { UptimeConfig } from '../../config';
import { settingsObjectId, umDynamicSettings } from './uptime_settings';
import { syntheticsMonitor } from './synthetics_monitor';

export interface UMSavedObjectsAdapter {
  config: UptimeConfig;
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettings>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettings>;
}

export const registerUptimeSavedObjects = (
  savedObjectsService: SavedObjectsServiceSetup,
  config: UptimeConfig
) => {
  savedObjectsService.registerType(umDynamicSettings);

  if (config?.unsafe?.service.enabled) {
    savedObjectsService.registerType(syntheticsMonitor);
  }
};

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  config: null,
  getUptimeDynamicSettings: async (client): Promise<DynamicSettings> => {
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
  setUptimeDynamicSettings: async (client, settings): Promise<void> => {
    await client.create(umDynamicSettings.name, settings, {
      id: settingsObjectId,
      overwrite: true,
    });
  },
};
