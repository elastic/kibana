/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

export const CASE_CONFIGURE_SAVED_OBJECT = 'cases-configure';

export const caseConfigureSavedObjectType: SavedObjectsType = {
  name: CASE_CONFIGURE_SAVED_OBJECT,
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      created_at: {
        type: 'date',
      },
      created_by: {
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
      connector_id: {
        type: 'keyword',
      },
      connector_name: {
        type: 'keyword',
      },
      closure_type: {
        type: 'keyword',
      },
      updated_at: {
        type: 'date',
      },
      updated_by: {
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
    },
  },
};
