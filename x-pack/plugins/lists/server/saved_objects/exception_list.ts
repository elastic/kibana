/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'kibana/server';

export const exceptionListSavedObjectType = 'exception-list';
export const exceptionListAgnosticSavedObjectType = 'exception-list-agnostic';
export type SavedObjectType = 'exception-list' | 'exception-list-agnostic';

export const exceptionListMapping: SavedObjectsType['mappings'] = {
  properties: {
    _tags: {
      type: 'keyword',
    },
    created_at: {
      type: 'keyword',
    },
    created_by: {
      type: 'keyword',
    },
    description: {
      type: 'keyword',
    },
    list_id: {
      type: 'keyword',
    },
    meta: {
      type: 'keyword',
    },
    name: {
      type: 'keyword',
    },
    tags: {
      type: 'keyword',
    },
    tie_breaker_id: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
    updated_by: {
      type: 'date',
    },
  },
};

export const exceptionListType: SavedObjectsType = {
  hidden: false,
  mappings: exceptionListMapping,
  name: exceptionListSavedObjectType,
  namespaceType: 'single',
};

export const exceptionListAgnosticType: SavedObjectsType = {
  hidden: false,
  mappings: exceptionListMapping,
  name: exceptionListAgnosticSavedObjectType,
  namespaceType: 'agnostic',
};
