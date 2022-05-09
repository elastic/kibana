/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { FILE_SO_TYPE } from '../../common';
import type { FileSavedObjectAttributes } from '../../common';

export const fileObjectType: SavedObjectsType<FileSavedObjectAttributes> = {
  name: FILE_SO_TYPE,
  hidden: true,
  namespaceType: 'multiple', // TODO: Review this decision, the assumption for now is that file saved objects can exist across namespaces
  // management: {
  //   visibleInManagement: false,
  // },
  mappings: {
    dynamic: false,
    properties: {
      created_at: {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
      name: {
        type: 'keyword',
      },
      status: {
        type: 'keyword',
      },
      created_by: {
        type: 'keyword',
      },
      storage_id: {
        type: 'keyword',
      },
      content_ref: {
        type: 'keyword',
      },
      content_type: {
        type: 'keyword',
      },
      size: {
        type: 'long',
      },
    },
  },
};
