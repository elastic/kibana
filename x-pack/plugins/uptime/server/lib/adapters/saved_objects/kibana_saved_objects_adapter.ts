/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsAdapter } from './types';
import { umDynamicSettings } from '../../sources';
import { DynamicSettings } from '../../../../../../legacy/plugins/uptime/common/runtime_types/dynamic_settings';

export const savedObjectsAdapter: UMSavedObjectsAdapter = {
  getUptimeDynamicSettings: async (client): Promise<DynamicSettings> => {
    try {
      const obj = await client.get<DynamicSettings>(umDynamicSettings.type, umDynamicSettings.id)
      return obj.attributes;
    } catch (e) {
      try {
        return (
          await client.create(umDynamicSettings.type, umDynamicSettings.defaults, {
            id: umDynamicSettings.id,
            overwrite: false,
          })
        ).attributes;
      } catch (otherE) {
        return otherE;
      }
    }
  },
  setUptimeDynamicSettings: async (client, settings) => {
    // @ts-ignore
    client.update(umDynamicSettings.type, umDynamicSettings.id, settings);
  },
};
