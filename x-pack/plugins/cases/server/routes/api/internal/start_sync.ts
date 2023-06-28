/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Syncer } from '../../../services/sync/task_service';
import { createCaseError } from '../../../common/error';
import { INTERNAL_START_SYNC } from '../../../../common/constants';
import { createCasesRoute } from '../create_cases_route';

export const startSyncRoute = (syncer: Syncer) =>
  createCasesRoute({
    method: 'post',
    path: INTERNAL_START_SYNC,
    handler: async ({ context, request, response }) => {
      try {
        await syncer.initializeApiKey(request);
        await syncer.schedule();

        return response.noContent();
      } catch (error) {
        throw createCaseError({
          message: `Failed to start syncing: ${error}`,
        });
      }
    },
  });
