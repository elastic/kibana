/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultDynamicSettings } from '../../../../../legacy/plugins/uptime/common/runtime_types';

export interface UMDynamicSettingsType {
  heartbeatIndices: string;
}

const type = 'uptime-dynamic-settings';

export const umDynamicSettings = {
  type,
  id: 'uptime-dynamic-settings-singleton',
  defaults: defaultDynamicSettings,
  mapping: {
    [type]: {
      properties: {
        heartbeatIndices: {
          type: 'keyword',
        },
      },
    },
  },
};
