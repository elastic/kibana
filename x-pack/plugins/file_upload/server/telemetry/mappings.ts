/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { TELEMETRY_DOC_ID } from './telemetry';

export const telemetryMappingsType: SavedObjectsType = {
  name: TELEMETRY_DOC_ID,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      file_upload: {
        properties: {
          index_creation_count: {
            type: 'long',
          },
        },
      },
    },
  },
};
