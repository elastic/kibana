/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { CANVAS_TYPE } from '../../common/lib/constants';
import { workpadMigrationsFactory } from './migrations';
import type { CanvasSavedObjectTypeMigrationsDeps } from './migrations';

export const workpadTypeFactory = (
  deps: CanvasSavedObjectTypeMigrationsDeps
): SavedObjectsType => ({
  name: CANVAS_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      '@timestamp': { type: 'date' },
      '@created': { type: 'date' },
    },
  },
  migrations: workpadMigrationsFactory(deps),
  management: {
    importableAndExportable: true,
    icon: 'canvasApp',
    defaultSearchField: 'name',
    getTitle(obj) {
      return obj.attributes.name;
    },
    getInAppUrl(obj) {
      return {
        path: `/app/canvas#/workpad/${encodeURIComponent(obj.id)}`,
        uiCapabilitiesPath: 'canvas.show',
      };
    },
  },
});
