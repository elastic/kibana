/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'kibana/server';

export const BACKGROUND_SESSION_TYPE = 'background-session';

export const backgroundSession: SavedObjectsType = {
  name: BACKGROUND_SESSION_TYPE,
  namespaceType: 'single',
  hidden: false,
  mappings: {
    properties: {
      sessionId: {
        type: 'keyword',
      },
      name: {
        type: 'text',
      },
      creation: {
        type: 'date',
      },
      lastUpdated: {
        type: 'date',
      },
      expiration: {
        type: 'date',
      },
      status: {
        type: 'short',
      },
      idMapping: {
        dynamic: 'true',
        type: 'object',
        enabled: false,
      },
      optOutIds: {
        type: 'keyword',
      },
    },
  },
};
