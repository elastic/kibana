/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

import { REINDEX_OP_TYPE } from '../../common/types';

export const reindexOperationSavedObjectType: SavedObjectsType = {
  name: REINDEX_OP_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      indexName: {
        type: 'keyword',
      },
      status: {
        type: 'integer',
      },
    },
  },
};
