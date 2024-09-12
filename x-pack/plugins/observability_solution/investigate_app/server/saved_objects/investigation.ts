/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObject } from '@kbn/core/server';
import { StoredInvestigation } from '../models/investigation';

export const SO_INVESTIGATION_TYPE = 'investigation';

export const investigation: SavedObjectsType = {
  name: SO_INVESTIGATION_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      title: { type: 'text' },
      origin: {
        properties: {
          type: { type: 'keyword' },
          id: { type: 'keyword' },
        },
      },
      status: { type: 'keyword' },
      tags: { type: 'keyword' },
      updatedAt: { type: 'date' },
      createdAt: { type: 'date' },
      createdBy: { type: 'keyword' },
    },
  },
  management: {
    displayName: 'Investigation',
    importableAndExportable: false,
    getTitle(savedObject: SavedObject<StoredInvestigation>) {
      return `Investigation: [${savedObject.attributes.title}]`;
    },
  },
};
