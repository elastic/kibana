/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core/server';

import { StoredSLO } from '../domain/models';

export const SO_SLO_TYPE = 'slo';

export const slo: SavedObjectsType = {
  name: SO_SLO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      description: { type: 'text' },
      indicator: {
        properties: {
          type: { type: 'keyword' },
          params: { type: 'flattened' },
        },
      },
      timeWindow: {
        properties: {
          duration: { type: 'keyword' },
          isRolling: { type: 'boolean' },
          calendar: {
            properties: {
              startTime: { type: 'date' },
            },
          },
        },
      },
      budgetingMethod: { type: 'keyword' },
      objective: {
        properties: {
          target: { type: 'float' },
          timesliceTarget: { type: 'float' },
          timesliceWindow: { type: 'keyword' },
        },
      },
      settings: {
        properties: {
          timestampField: { type: 'keyword' },
          syncDelay: { type: 'keyword' },
          frequency: { type: 'keyword' },
        },
      },
      revision: { type: 'short' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
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
