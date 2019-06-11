/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SAVED_OBJECT_TYPE } from '../common/constants';
import { Request } from '../common/types';

export const getClient = (req: Request) => req.getSavedObjectsClient();

export const mappings = {
  [SAVED_OBJECT_TYPE]: {
    properties: {
      is_working: {
        type: 'boolean',
      },
      other: {
        type: 'keyword',
      },
    },
  },
};

export const savedObjectSchemas = {
  [SAVED_OBJECT_TYPE]: {
    isNamespaceAgnostic: true,
  },
};
