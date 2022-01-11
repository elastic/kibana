/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { CUSTOM_ELEMENT_TYPE } from '../../common/lib/constants';
import { customElementMigrationsFactory, CanvasSavedObjectTypeMigrationsDeps } from './migrations';

export const customElementType = (deps: CanvasSavedObjectTypeMigrationsDeps): SavedObjectsType => ({
  name: CUSTOM_ELEMENT_TYPE,
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
      help: { type: 'text' },
      content: { type: 'text' },
      image: { type: 'text' },
      '@timestamp': { type: 'date' },
      '@created': { type: 'date' },
    },
  },
  migrations: customElementMigrationsFactory(deps),
  management: {
    icon: 'canvasApp',
    defaultSearchField: 'name',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.displayName;
    },
  },
});
