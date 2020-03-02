/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DynamicSettings,
  defaultDynamicSettings,
} from '../../../../legacy/plugins/uptime/common/runtime_types/dynamic_settings';
import { SavedObjectsType } from '../../../../../src/core/server';
import { UMSavedObjectsQueryFn } from './adapters';

export interface UMDynamicSettingsType {
  heartbeatIndices: string;
}

export interface UMSavedObjectsAdapter {
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettings>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettings>;
}

const settingsId = 'uptime-dynamic-settings-singleton';

export const umDynamicSettings: SavedObjectsType = {
  name: 'uptime-dynamic-settings',
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
      const obj = await client.get<DynamicSettings>(umDynamicSettings.name, settingsId);
      return obj.attributes;
    } catch (e) {
      try {
        return (
          await client.create(umDynamicSettings.name, defaultDynamicSettings, {
            id: settingsId,
            overwrite: false,
          })
        ).attributes;
      } catch (otherE) {
        return otherE;
      }
    }
  },
  setUptimeDynamicSettings: async (client, settings) => {
    client.update(umDynamicSettings.name, settingsId, settings);
  },
};
