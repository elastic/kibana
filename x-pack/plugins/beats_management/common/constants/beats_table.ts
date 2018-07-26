/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TABLE_CONFIG = {
  INITIAL_ROW_SIZE: 5,
  PAGE_SIZE_OPTIONS: [3, 5, 10, 20],
  ACTIONS: {
    BULK_ASSIGN_TAG: 'BULK_ASSIGN_TAG',
    BULK_DELETE: 'BULK_DELETE',
    BULK_EDIT: 'BULK_EDIT',
  },
  TRUNCATE_TAG_LENGTH: 33,
};
