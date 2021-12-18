/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../common/constants';
import { userActionsMigrations } from './migrations';

export const caseUserActionSavedObjectType: SavedObjectsType = {
  name: CASE_USER_ACTION_SAVED_OBJECT,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
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
      owner: {
        type: 'keyword',
      },
    },
  },
  migrations: userActionsMigrations,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
};
