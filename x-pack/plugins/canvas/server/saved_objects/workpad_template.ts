/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { TEMPLATE_TYPE } from '../../common/lib/constants';

export const workpadTemplateType: SavedObjectsType = {
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
  migrations: {},
  management: {
    importableAndExportable: true,
    icon: 'canvasApp',
    defaultSearchField: 'name',
    getTitle(obj) {
      return obj.attributes.name;
    },
  },
};
