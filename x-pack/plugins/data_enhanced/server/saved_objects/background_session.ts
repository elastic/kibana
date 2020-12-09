/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'kibana/server';

export const BACKGROUND_SESSION_TYPE = 'background-session';

export const backgroundSessionMapping: SavedObjectsType = {
  name: BACKGROUND_SESSION_TYPE,
  namespaceType: 'single',
  hidden: true,
  mappings: {
    properties: {
      sessionId: {
        type: 'keyword',
      },
      name: {
        type: 'keyword',
      },
      created: {
        type: 'date',
      },
      expires: {
        type: 'date',
      },
      status: {
        type: 'keyword',
      },
      appId: {
        type: 'keyword',
      },
      urlGeneratorId: {
        type: 'keyword',
      },
      initialState: {
        type: 'object',
        enabled: false,
      },
      restoreState: {
        type: 'object',
        enabled: false,
      },
      idMapping: {
        type: 'object',
        enabled: false,
      },
    },
  },
};
