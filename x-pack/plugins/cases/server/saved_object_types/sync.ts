/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { CASE_SYNC_SAVED_OBJECT } from '../../common/constants';

export const casesSyncSavedObjectType: SavedObjectsType = {
  name: CASE_SYNC_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      lastSynced: {
        type: 'date',
      },
      externalId: {
        type: 'keyword',
      },
    },
  },
};
