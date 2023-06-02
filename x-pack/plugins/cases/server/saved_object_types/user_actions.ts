/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../common/constants';
import type { UserActionsMigrationsDeps } from './migrations/user_actions';
import { createUserActionsMigrations } from './migrations/user_actions';

/**
 * The comments in the mapping indicate the additional properties that are stored in Elasticsearch but are not indexed.
 * Remove these comments when https://github.com/elastic/kibana/issues/152756 is resolved.
 */

export const createCaseUserActionSavedObjectType = (
  migrationDeps: UserActionsMigrationsDeps
): SavedObjectsType => ({
  name: CASE_USER_ACTION_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      action: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          /*
          email: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          profile_uid: {
            type: 'keyword',
          },
          */
          username: {
            type: 'keyword',
          },
        },
      },
      payload: {
        dynamic: false,
        properties: {
          connector: {
            properties: {
              // connector.type
              type: { type: 'keyword' },
            },
          },
          comment: {
            properties: {
              // comment.type
              type: { type: 'keyword' },
              // comment.externalReferenceAttachmentTypeId
              externalReferenceAttachmentTypeId: { type: 'keyword' },
              // comment.persistableStateAttachmentTypeId
              persistableStateAttachmentTypeId: { type: 'keyword' },
            },
          },
          assignees: {
            properties: {
              // assignees.uid
              uid: { type: 'keyword' },
            },
          },
        },
      },
      owner: {
        type: 'keyword',
      },
      // The type of the action
      type: {
        type: 'keyword',
      },
    },
  },
  migrations: () => createUserActionsMigrations(migrationDeps),
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
});
