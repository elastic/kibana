/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const maintenanceWindowMappings: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    enabled: {
      type: 'boolean',
    },
    events: {
      type: 'date_range',
      format: 'epoch_millis||strict_date_optional_time',
    },
    title: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    expirationDate: {
      type: 'date',
    },
    // NO NEED TO BE INDEXED
    // duration: {
    //   type: 'long',
    // },
    // rRule: rRuleMappingsField,
    // createdBy: {
    //   index: false,
    //   type: 'keyword',
    // },
    // updatedBy: {
    //   index: false,
    //   type: 'keyword',
    // },
    // createdAt: {
    //   index: false,
    //   type: 'date',
    // },
    // updatedAt: {
    //   index: false,
    //   type: 'date',
    // },
  },
};
