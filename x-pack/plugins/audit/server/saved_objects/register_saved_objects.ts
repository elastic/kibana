/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from '@kbn/core-saved-objects-server';
import { AUDIT_SAVED_OBJECT_TYPE } from '../../common';

export function registerSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: AUDIT_SAVED_OBJECT_TYPE,
    namespaceType: 'multiple-isolated',
    hidden: true,
    mappings: {
      dynamic: false,
      properties: {
        '@timestamp': {
          type: 'date',
        },
        namespace: {
          type: 'keyword',
        },
        operation: {
          type: 'keyword',
        },
        user: {
          type: 'keyword',
        },
        subject: {
          type: 'keyword',
        },
        subjectId: {
          type: 'keyword',
        },
        data: {
          type: 'object',
          properties: {
            old: {
              type: 'text',
            },
            new: {
              type: 'text',
            },
          },
        },
      },
    },
    migrations: {},
    indexPattern: '.kibana_audit',
  });
}
