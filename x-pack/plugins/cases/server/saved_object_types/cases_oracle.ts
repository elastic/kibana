/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_ORACLE_SAVED_OBJECT } from '../../common/constants';

export const casesOracleSavedObjectType: SavedObjectsType = {
  name: CASE_ORACLE_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  /**
   * TODO: Verify
   */
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      case_ids: {
        type: 'keyword',
      },
      counter: {
        type: 'unsigned_long',
      },
      created_at: {
        type: 'date',
      },
      /*
      grouping_definition: {
        type: 'keyword',
      },
      */
      rule_id: {
        type: 'keyword',
      },
      updated_at: {
        type: 'date',
      },
    },
  },
};
