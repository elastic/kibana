/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

export const CASE_SAVED_OBJECT = 'cases';

export const caseSavedObjectType: SavedObjectsType = {
  name: CASE_SAVED_OBJECT,
  hidden: false,
  namespaceAgnostic: false,
  mappings: {
    properties: {
<<<<<<< HEAD
      closed_at: {
        type: 'date',
      },
      closed_by: {
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
      comment_ids: {
        type: 'keyword',
      },
=======
>>>>>>>  modify API to get the total comments in _find + Add user action to track what user are doing + create _pushed api to know when case have been pushed
      created_at: {
        type: 'date',
      },
      created_by: {
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
      description: {
        type: 'text',
      },
      pushed: {
        properties: {
          at: {
            type: 'date',
          },
          by: {
            properties: {
              username: {
                type: 'keyword',
              },
              full_name: {
                type: 'keyword',
              },
            },
          },
          connector_id: {
            type: 'keyword',
          },
          connector_name: {
            type: 'keyword',
          },
          external_id: {
            type: 'keyword',
          },
          external_title: {
            type: 'text',
          },
          external_url: {
            type: 'text',
          },
        },
      },
      title: {
        type: 'keyword',
      },
      status: {
        type: 'keyword',
      },
      tags: {
        type: 'keyword',
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
};
