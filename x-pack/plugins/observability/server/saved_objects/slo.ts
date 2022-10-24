/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core/server';

import { StoredSLO } from '../types/models';

export const SO_SLO_TYPE = 'slo';

export const slo: SavedObjectsType = {
  name: SO_SLO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text' },
      description: { type: 'text' },
      indicator: {
        properties: {
          type: { type: 'keyword' },
          params: { type: 'flattened' },
        },
      },
      time_window: {
        properties: {
          duration: { type: 'keyword' },
          is_rolling: { type: 'boolean' },
          calendar: {
            properties: {
              start_time: { type: 'date' },
            },
          },
        },
      },
      budgeting_method: { type: 'keyword' },
      objective: {
        properties: {
          target: { type: 'float' },
        },
      },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
  management: {
    displayName: 'SLO',
    importableAndExportable: true,
    getTitle(sloSavedObject: SavedObject<StoredSLO>) {
      return `SLO: [${sloSavedObject.attributes.name}]`;
    },
  },
};
