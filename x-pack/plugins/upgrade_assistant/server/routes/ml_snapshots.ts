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

export function registerMlSnapshotRoutes({ router }: RouteDependencies) {
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

          const {
            body: upgradeSnapshotResponse,
          } = await client.asCurrentUser.ml.updateModelSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
            body: {},
          });

          return response.ok({
            body: upgradeSnapshotResponse,
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );

  router.delete(
    {
      path: `${API_BASE_PATH}/ml_snapshots/{jobId}/{snapshotId}`,
      validate: {
        params: schema.object({
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
          const { snapshotId, jobId } = request.params;

          const {
            body: deleteSnapshotResponse,
          } = await client.asCurrentUser.ml.deleteModelSnapshot({
            job_id: jobId,
            snapshot_id: snapshotId,
          });

          return response.ok({
            body: deleteSnapshotResponse,
          });
        } catch (e) {
          return handleEsError({ error: e, response });
        }
      }
    )
  );
}
