/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { SEARCH_SESSION_TYPE } from '@kbn/data-plugin/common';
import { searchSessionSavedObjectMigrations } from './search_session_migration';

export const searchSessionSavedObjectType: SavedObjectsType = {
  name: SEARCH_SESSION_TYPE,
  namespaceType: 'single',
  hidden: true,
  mappings: {
    properties: {
      persisted: {
        type: 'boolean',
      },
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
      touched: {
        type: 'date',
      },
      completed: {
        type: 'date',
      },
      status: {
        type: 'keyword',
      },
      appId: {
        type: 'keyword',
      },
      locatorId: {
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
      realmType: {
        type: 'keyword',
      },
      realmName: {
        type: 'keyword',
      },
      username: {
        type: 'keyword',
      },
      version: {
        type: 'keyword',
      },
    },
  },
  migrations: searchSessionSavedObjectMigrations,
};
