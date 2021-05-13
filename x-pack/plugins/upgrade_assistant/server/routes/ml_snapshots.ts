/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { handleEsError } from '../shared_imports';
import { RouteDependencies } from '../types';

export function registerUpgradeMlSnapshotsRoute({ router }: RouteDependencies) {
  router.post(
    {
      path: `${API_BASE_PATH}/ml_snapshots`,
      validate: {
        body: schema.object({
          snapshotId: schema.string(),
          jobId: schema.string(),
        }),
      },
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        try {
          const { snapshotId, jobId } = request.body;

          const { body: mlResponse } = await client.asCurrentUser.ml.updateModelSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
            body: {},
          });

          return response.ok({
            body: mlResponse,
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );
}
