/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyFromES } from '../../../public/application/services/policies/types';

export const POLICY_NAME = 'my_policy';
export const SNAPSHOT_POLICY_NAME = 'my_snapshot_policy';
export const NEW_SNAPSHOT_POLICY_NAME = 'my_new_snapshot_policy';

export const DELETE_PHASE_POLICY: PolicyFromES = {
  version: 1,
  modified_date: Date.now().toString(),
  policy: {
    phases: {
      hot: {
        min_age: '0ms',
        actions: {
          rollover: {
            max_size: '50gb',
          },
        },
      },
      delete: {
        min_age: '0ms',
        actions: {
          wait_for_snapshot: {
            policy: SNAPSHOT_POLICY_NAME,
          },
          delete: {
            delete_searchable_snapshot: true,
          },
        },
      },
    },
    name: POLICY_NAME,
  },
  name: POLICY_NAME,
};
