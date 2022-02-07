/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { TEMPLATE_TYPE } from '../../common/lib/constants';
import {
  CanvasSavedObjectTypeMigrationsDeps,
  templateWorkpadMigrationsFactory,
} from './migrations';

export const workpadTemplateType = (
  deps: CanvasSavedObjectTypeMigrationsDeps
): SavedObjectsType => ({
  name: TEMPLATE_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
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
      help: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      tags: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
      template_key: {
        type: 'keyword',
      },
    },
  },
  migrations: templateWorkpadMigrationsFactory(deps),
  management: {
    importableAndExportable: false,
    icon: 'canvasApp',
    defaultSearchField: 'name',
    getTitle(obj) {
      return obj.attributes.name;
    },
  },
});
