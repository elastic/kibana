/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { CANVAS_TYPE } from '../../common/lib/constants';
import { removeAttributesId } from './migrations/remove_attributes_id';

export const workpadType: SavedObjectsType = {
  name: CANVAS_TYPE,
  hidden: false,
  namespaceType: 'single',
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
  migrations: {
    '7.0.0': removeAttributesId,
  },
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
};
