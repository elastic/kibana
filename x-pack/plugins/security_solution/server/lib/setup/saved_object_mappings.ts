/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../src/core/server';

export const endpointUserSavedObjectType = 'securitySolution-endpoint-user';

export const endpointUserSavedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    username: {
      type: 'keyword',
    },
    password: {
      type: 'keyword',
    },
    apikey: {
      type: 'keyword',
    },
    created: {
      type: 'date',
    },
  },
};

export const type: SavedObjectsType = {
  name: endpointUserSavedObjectType,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: endpointUserSavedObjectMappings,
};

export interface EndpointUser {
  username: string;
  password: string;
  apikey: string;
  created: number;
}
