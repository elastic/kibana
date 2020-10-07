/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { userActionsMigrations } from './migrations';

export const CASE_USER_ACTION_SAVED_OBJECT = 'cases-user-actions';

export const caseUserActionSavedObjectType: SavedObjectsType = {
  name: CASE_USER_ACTION_SAVED_OBJECT,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      action_field: {
        type: 'keyword',
      },
      action: {
        type: 'keyword',
      },
      action_at: {
        type: 'date',
      },
      action_by: {
        properties: {
          email: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
        },
      },
      new_value: {
        type: 'text',
      },
      old_value: {
        type: 'text',
      },
    },
  },
  migrations: userActionsMigrations,
};
