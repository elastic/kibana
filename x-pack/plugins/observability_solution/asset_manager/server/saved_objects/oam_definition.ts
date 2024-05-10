/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { OAMDefinition } from '@kbn/oam-schema';

export const SO_OAM_DEFINITION_TYPE = 'oam-definition';

export const oamDefinition: SavedObjectsType = {
  name: SO_OAM_DEFINITION_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      description: { type: 'text' },
      type: { type: 'keyword' },
      filter: { type: 'keyword' },
      indexPatterns: { type: 'keyword' },
      identityFields: { type: 'keyword' },
      categories: { type: 'keyword' },
      metadata: { type: 'object' },
      metrics: { type: 'object' },
      staticFields: { type: 'object' },
    },
  },
  management: {
    displayName: 'OAM Definition',
    importableAndExportable: false,
    getTitle(sloSavedObject: SavedObject<OAMDefinition>) {
      return `OAM: [${sloSavedObject.attributes.name}]`;
    },
  },
};
