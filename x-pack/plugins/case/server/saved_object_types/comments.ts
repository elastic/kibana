/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { commentsMigrations } from './migrations';

export const CASE_COMMENT_SAVED_OBJECT = 'cases-comments';

export const caseCommentSavedObjectType: SavedObjectsType = {
  name: CASE_COMMENT_SAVED_OBJECT,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      comment: {
        type: 'text',
      },
      type: {
        type: 'keyword',
      },
      alertId: {
        type: 'keyword',
      },
      index: {
        type: 'keyword',
      },
      created_at: {
        type: 'date',
      },
      created_by: {
        properties: {
          full_name: {
            type: 'keyword',
          },
          username: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
        },
      },
      pushed_at: {
        type: 'date',
      },
      pushed_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
        },
      },
      updated_at: {
        type: 'date',
      },
      updated_by: {
        properties: {
          username: {
            type: 'keyword',
          },
          full_name: {
            type: 'keyword',
          },
          email: {
            type: 'keyword',
          },
        },
      },
    },
  },
  migrations: commentsMigrations,
};
