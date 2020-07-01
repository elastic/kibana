/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'kibana/server';
import { graphMigrations } from './migrations';

export const graphWorkspace: SavedObjectsType = {
  name: 'graph-workspace',
  namespaceType: 'single',
  hidden: false,
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
            index: false,
          },
        },
      },
      numLinks: {
        type: 'integer',
        index: false,
      },
      numVertices: {
        type: 'integer',
        index: false,
      },
      title: {
        type: 'text',
      },
      version: {
        type: 'integer',
        index: false,
      },
      wsState: {
        type: 'text',
        index: false,
      },
    },
  },
};
