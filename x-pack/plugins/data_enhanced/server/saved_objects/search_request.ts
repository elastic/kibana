/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'kibana/server';
import { SEARCH_REQUEST_TYPE } from '../../../../../src/plugins/data/common';

export const searchRequestSavedObjectType: SavedObjectsType = {
  name: SEARCH_REQUEST_TYPE,
  namespaceType: 'single',
  hidden: true,
  mappings: {
    properties: {
      id: {
        type: 'keyword',
      },
      sessionId: {
        type: 'keyword',
      },
      strategy: {
        type: 'keyword',
      },
      requestHash: {
        type: 'keyword',
      },
      status: {
        type: 'keyword',
      },
      isStored: {
        type: 'boolean',
      },
    },
  },
};
