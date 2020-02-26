/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsAdapter } from './types';
import {
  DynamicSettings,
  defaultDynamicSettings,
} from '../../../../../../legacy/plugins/uptime/common/runtime_types/dynamic_settings';
import { umDynamicSettings } from '../../saved_object_mappings';

const id = 'uptime-dynamic-settings-singleton';

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeDynamicSettings: async (client): Promise<DynamicSettings> => {
    try {
      const obj = await client.get<DynamicSettings>(umDynamicSettings.name, id);
      return obj.attributes;
    } catch (e) {
      try {
        return (
          await client.create(umDynamicSettings.name, defaultDynamicSettings, {
            id,
            overwrite: false,
          })
        ).attributes;
      } catch (otherE) {
        return otherE;
      }
    }
  },
  setUptimeDynamicSettings: async (client, settings) => {
    client.update(umDynamicSettings.name, id, settings);
  },
};
