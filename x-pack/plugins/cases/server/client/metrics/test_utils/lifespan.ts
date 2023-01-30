/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { CaseStatuses, CaseUserActionInjectedAttributes } from '../../../../common/api';

export function createStatusChangeSavedObject(
  status: CaseStatuses,
  createdAt: Date
): SavedObject<CaseUserActionInjectedAttributes> {
  return {
    references: [],
    id: '',
    type: '',
    attributes: {
      created_at: createdAt.toISOString(),
      created_by: {
        username: 'j@j.com',
        email: null,
        full_name: null,
      },
      owner: 'securitySolution',
      action: 'update',
      payload: {
        status,
      },
      type: 'status',
      comment_id: null,
    },
  };
}
