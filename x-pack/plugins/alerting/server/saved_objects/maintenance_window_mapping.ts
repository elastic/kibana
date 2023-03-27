/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';
import { rRuleMappingsField } from './rrule_mappings_field';

export const maintenanceWindowMappings: SavedObjectsTypeMappingDefinition = {
  properties: {
    title: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    enabled: {
      type: 'boolean',
    },
    duration: {
      type: 'long',
    },
    expirationDate: {
      type: 'date',
    },
    events: {
      type: 'date_range',
      format: 'epoch_millis||strict_date_optional_time',
    },
    rRule: rRuleMappingsField,
    createdBy: {
      type: 'keyword',
    },
    updatedBy: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
  },
};
