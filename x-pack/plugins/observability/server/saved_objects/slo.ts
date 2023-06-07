/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectMigrationFn, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core/server';

import { StoredSLO } from '../domain/models';

type StoredSLOBefore890 = StoredSLO & {
  timeWindow: {
    duration: string;
    isRolling?: boolean;
    isCalendar?: boolean;
  };
};

const migrateSlo890: SavedObjectMigrationFn<StoredSLOBefore890, StoredSLO> = (doc) => {
  const { timeWindow, ...other } = doc.attributes;
  return {
    ...doc,
    attributes: {
      ...other,
      timeWindow: {
        duration: timeWindow.duration,
        type: timeWindow.isCalendar ? 'calendarAligned' : 'rolling',
      },
    },
  };
};

export const SO_SLO_TYPE = 'slo';

export const slo: SavedObjectsType = {
  name: SO_SLO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      description: { type: 'text' },
      indicator: {
        properties: {
          type: { type: 'keyword' },
          params: { type: 'flattened' },
        },
      },
      budgetingMethod: { type: 'keyword' },
      enabled: { type: 'boolean' },
      tags: { type: 'keyword' },
    },
  },
  management: {
    displayName: 'SLO',
    importableAndExportable: true,
    getTitle(sloSavedObject: SavedObject<StoredSLO>) {
      return `SLO: [${sloSavedObject.attributes.name}]`;
    },
  },
  migrations: {
    '8.9.0': migrateSlo890,
  },
};
