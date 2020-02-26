/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'kibana/server';

export interface UMDynamicSettingsType {
  heartbeatIndices: string;
}

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
