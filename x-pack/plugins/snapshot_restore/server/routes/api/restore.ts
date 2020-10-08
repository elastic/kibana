/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

import { SnapshotRestore, SnapshotRestoreShardEs } from '../../../common/types';
import { serializeRestoreSettings } from '../../../common/lib';
import { deserializeRestoreShard } from '../../lib';
import { RouteDependencies } from '../../types';
import { addBasePath } from '../helpers';
import { restoreSettingsSchema } from './validate_schemas';

export function registerRestoreRoutes({ router, license, lib: { isEsError } }: RouteDependencies) {
  // GET all snapshot restores
  router.get(
    { path: addBasePath('restores'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;

      try {
        const snapshotRestores: SnapshotRestore[] = [];
        const recoveryByIndexName: {
          [key: string]: {
            shards: SnapshotRestoreShardEs[];
          };
        } = await callAsCurrentUser('indices.recovery', {
          human: true,
        });

        // Filter to snapshot-recovered shards only
        Object.keys(recoveryByIndexName).forEach((index) => {
          const recovery = recoveryByIndexName[index];
          let latestActivityTimeInMillis: number = 0;
          let latestEndTimeInMillis: number | null = null;
          const snapshotShards = (recovery.shards || [])
            .filter((shard) => shard.type === 'SNAPSHOT')
            .sort((a, b) => a.id - b.id)
            .map((shard) => {
              const deserializedShard = deserializeRestoreShard(shard);
              const { startTimeInMillis, stopTimeInMillis } = deserializedShard;

              // Set overall latest activity time
              latestActivityTimeInMillis = Math.max(
                startTimeInMillis || 0,
                stopTimeInMillis || 0,
                latestActivityTimeInMillis
              );

              // Set overall end time
              if (stopTimeInMillis === undefined) {
                latestEndTimeInMillis = null;
              } else if (
                latestEndTimeInMillis === null ||
                stopTimeInMillis > latestEndTimeInMillis
              ) {
                latestEndTimeInMillis = stopTimeInMillis;
              }

              return deserializedShard;
            });

          if (snapshotShards.length > 0) {
            snapshotRestores.push({
              index,
              latestActivityTimeInMillis,
              shards: snapshotShards,
              isComplete: latestEndTimeInMillis !== null,
            });
          }
        });

        // Sort by latest activity
        snapshotRestores.sort(
          (a, b) => b.latestActivityTimeInMillis - a.latestActivityTimeInMillis
        );

        return res.ok({ body: snapshotRestores });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );

  // Restore snapshot
  const restoreParamsSchema = schema.object({
    repository: schema.string(),
    snapshot: schema.string(),
  });

  router.post(
    {
      path: addBasePath('restore/{repository}/{snapshot}'),
      validate: { body: restoreSettingsSchema, params: restoreParamsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { repository, snapshot } = req.params as TypeOf<typeof restoreParamsSchema>;
      const restoreSettings = req.body as TypeOf<typeof restoreSettingsSchema>;

      try {
        const response = await callAsCurrentUser('snapshot.restore', {
          repository,
          snapshot,
          body: serializeRestoreSettings(restoreSettings),
        });

        return res.ok({ body: response });
      } catch (e) {
        if (isEsError(e)) {
          return res.customError({
            statusCode: e.statusCode,
            body: e,
          });
        }
        // Case: default
        return res.internalError({ body: e });
      }
    })
  );
}
