/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';

import { REINDEX_OP_TYPE } from '../../common/types';

export const reindexOperationSavedObjectType: SavedObjectsType = {
  name: REINDEX_OP_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
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
