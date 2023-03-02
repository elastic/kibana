/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { CASE_COMMENT_SAVED_OBJECT } from '../../common/constants';
import type { CreateCommentsMigrationsDeps } from './migrations';
import { createCommentsMigrations } from './migrations';

export const createCaseCommentSavedObjectType = ({
  migrationDeps,
}: {
  migrationDeps: CreateCommentsMigrationsDeps;
}): SavedObjectsType => ({
  name: CASE_COMMENT_SAVED_OBJECT,
  hidden: true,
  namespaceType: 'multiple-isolated',
  convertToMultiNamespaceTypeVersion: '8.0.0',
  mappings: {
    dynamic: false,
    properties: {
      comment: {
        type: 'text',
      },
      owner: {
        type: 'keyword',
      },
      type: {
        type: 'keyword',
      },
      actions: {
        properties: {
          type: { type: 'keyword' },
        },
      },
      alertId: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          username: {
            type: 'keyword',
          },
        },
      },
      externalReferenceAttachmentTypeId: {
        type: 'keyword',
      },
      persistableStateAttachmentTypeId: {
        type: 'keyword',
      },
      pushed_at: {
        type: 'date',
      },
      updated_at: {
        type: 'date',
      },
    },
  },
  migrations: () => createCommentsMigrations(migrationDeps),
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
});
