/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DynamicSettings,
  defaultDynamicSettings,
} from '../../../../legacy/plugins/uptime/common/runtime_types/dynamic_settings';
import { SavedObjectsType, SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { UMSavedObjectsQueryFn } from './adapters';

export interface UMDynamicSettingsType {
  heartbeatIndices: string;
}

export interface UMSavedObjectsAdapter {
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettings>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettings>;
}

export const settingsObjectType = 'uptime-dynamic-settings';
export const settingsObjectId = 'uptime-dynamic-settings-singleton';

export const umDynamicSettings: SavedObjectsType = {
  name: settingsObjectType,
  hidden: false,
  namespaceAgnostic: false,
  mappings: {
    properties: {
      heartbeatIndices: {
        type: 'keyword',
      },
    },
  },
};

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeDynamicSettings: async (client): Promise<DynamicSettings> => {
    try {
      const obj = await client.get<DynamicSettings>(umDynamicSettings.name, settingsObjectId);
      return obj.attributes;
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return defaultDynamicSettings;
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
