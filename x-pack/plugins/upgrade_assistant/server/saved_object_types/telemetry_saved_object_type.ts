/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';

import { UPGRADE_ASSISTANT_TELEMETRY } from '../../common/constants';
import { telemetrySavedObjectMigrations } from './migrations';

export const telemetrySavedObjectType: SavedObjectsType = {
  name: UPGRADE_ASSISTANT_TELEMETRY,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      features: {
        properties: {
          deprecation_logging: {
            properties: {
              enabled: {
                type: 'boolean',
                null_value: true,
              },
            },
          },
        },
      },
    },
  },
  migrations: telemetrySavedObjectMigrations,
};
