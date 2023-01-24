/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { graphMigrations } from './migrations';

export const graphWorkspace: SavedObjectsType = {
  name: 'graph-workspace',
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  hidden: false,
  management: {
    icon: 'graphApp',
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/graph#/workspace/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'graph.show',
      };
    },
  },
  migrations: graphMigrations,
  mappings: {
    properties: {
      description: {
        type: 'text',
      },
      kibanaSavedObjectMeta: {
        properties: {
          searchSourceJSON: {
            type: 'text',
          },
        },
      },
      numLinks: {
        type: 'integer',
      },
      numVertices: {
        type: 'integer',
      },
      title: {
        type: 'text',
      },
      version: {
        type: 'integer',
      },
      wsState: {
        type: 'text',
      },
      legacyIndexPatternRef: {
        type: 'text',
        index: false,
      },
    },
  },
};
