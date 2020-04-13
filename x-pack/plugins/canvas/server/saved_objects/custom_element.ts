/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { CUSTOM_ELEMENT_TYPE } from '../../../../legacy/plugins/canvas/common/lib/constants';

export const customElementType: SavedObjectsType = {
  name: CUSTOM_ELEMENT_TYPE,
  hidden: false,
  namespaceAgnostic: false,
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
  migrations: {},
};
