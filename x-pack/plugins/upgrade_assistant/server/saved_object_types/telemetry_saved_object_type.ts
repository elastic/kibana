/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';

import { UPGRADE_ASSISTANT_TYPE } from '../../common/types';

export const telemetrySavedObjectType: SavedObjectsType = {
  name: UPGRADE_ASSISTANT_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      ui_open: {
        properties: {
          overview: {
            type: 'long',
            null_value: 0,
          },
          elasticsearch: {
            type: 'long',
            null_value: 0,
          },
          kibana: {
            type: 'long',
            null_value: 0,
          },
        },
      },
      ui_reindex: {
        properties: {
          close: {
            type: 'long',
            null_value: 0,
          },
          open: {
            type: 'long',
            null_value: 0,
          },
          start: {
            type: 'long',
            null_value: 0,
          },
          stop: {
            type: 'long',
            null_value: 0,
          },
        },
      },
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
};
