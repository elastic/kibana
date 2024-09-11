/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { EntityDefinition } from '@kbn/entities-schema';

export const SO_ENTITY_DEFINITION_TYPE = 'entity-definition';

export const entityDefinition: SavedObjectsType = {
  name: SO_ENTITY_DEFINITION_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      version: { type: 'keyword' },
      name: { type: 'text' },
      description: { type: 'text' },
      type: { type: 'keyword' },
      filter: { type: 'keyword' },
      indexPatterns: { type: 'keyword' },
      identityFields: { type: 'object' },
      metadata: { type: 'object' },
      metrics: { type: 'object' },
      staticFields: { type: 'object' },
      managed: { type: 'boolean' },
    },
  },
  management: {
    displayName: 'Entity Definition',
    importableAndExportable: false,
    getTitle(savedObject: SavedObject<EntityDefinition>) {
      return `EntityDefinition: [${savedObject.attributes.name}]`;
    },
  },
  modelVersions: {
    '1': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            version: { type: 'keyword' },
          },
        },
      ],
    },
    '2': {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: () => {
            return {
              attributes: {
                installStatus: 'installed',
                installStartedAt: new Date().toISOString(),
              },
            };
          },
        },
      ],
    },
  },
};
