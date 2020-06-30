/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const POLICY_NAME = 'my_policy';

export const DELETE_PHASE_POLICY = {
  version: 1,
  modified_date: Date.now(),
  policy: {
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          set_priority: {
            priority: null,
          },
          rollover: {
            max_size: '50gb',
          },
        },
      },
      delete: {
        min_age: '0ms',
        actions: {
          wait_for_snapshot: {
            policy: 'my_snapshot_policy',
          },
          delete: {
            delete_searchable_snapshot: true,
          },
        },
      },
    },
  },
  name: POLICY_NAME,
};
