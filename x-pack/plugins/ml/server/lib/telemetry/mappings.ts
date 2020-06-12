/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { TELEMETRY_DOC_ID } from './telemetry';

export const mlTelemetryMappingsType: SavedObjectsType = {
  name: TELEMETRY_DOC_ID,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      file_data_visualizer: {
        properties: {
          index_creation_count: {
            type: 'long',
          },
        },
      },
    },
  },
};
