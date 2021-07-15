/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { SnapshotDetailsEs } from '../../../common/types';
import { SNAPSHOT_LIST_MAX_SIZE } from '../../../common/constants';
import { deserializeSnapshotDetails } from '../../../common/lib';
import type { RouteDependencies } from '../../types';
import { getManagedRepositoryName } from '../../lib';
import { addBasePath } from '../helpers';

export function registerSnapshotsRoutes({
  router,
  license,
  lib: { wrapEsError, handleEsError },
}: RouteDependencies) {
  // GET all snapshots
  router.get(
    { path: addBasePath('snapshots'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = ctx.core.elasticsearch;

      const managedRepository = await getManagedRepositoryName(clusterClient.asCurrentUser);

      let policies: string[] = [];

      // Attempt to retrieve policies
      // This could fail if user doesn't have access to read SLM policies
      try {
        const { body: policiesByName } = await clusterClient.asCurrentUser.slm.getLifecycle();
        policies = Object.keys(policiesByName);
      } catch (e) {
        // Silently swallow error as policy names aren't required in UI
      }

      let repositories: string[] = [];

      try {
        const {
          body: repositoriesByName,
        } = await clusterClient.asCurrentUser.snapshot.getRepository({
          repository: '_all',
        });
        repositories = Object.keys(repositoriesByName);

        if (repositories.length === 0) {
          return res.ok({
            body: { snapshots: [], repositories: [], policies },
          });
        }
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }

      try {
        // If any of these repositories 504 they will cost the request significant time.
        const { body: fetchedSnapshots } = await clusterClient.asCurrentUser.snapshot.get({
          repository: '_all',
          snapshot: '_all',
          ignore_unavailable: true, // Allow request to succeed even if some snapshots are unavailable.
          // @ts-expect-error @elastic/elasticsearch "desc" is a new param
          order: 'desc',
          // TODO We are temporarily hard-coding the maximum number of snapshots returned
          // in order to prevent an unusable UI for users with large number of snapshots
          // In the near future, this will be resolved with server-side pagination
          size: SNAPSHOT_LIST_MAX_SIZE,
        });

        // Decorate each snapshot with the repository with which it's associated.
        const snapshots = fetchedSnapshots?.snapshots?.map((snapshot) => {
          return deserializeSnapshotDetails(snapshot as SnapshotDetailsEs, managedRepository);
        });

        return res.ok({
          body: {
            snapshots: snapshots || [],
            policies,
            repositories,
            // @ts-expect-error @elastic/elasticsearch "failures" is a new field in the response
            errors: fetchedSnapshots?.failures,
          },
        });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );

  const getOneParamsSchema = schema.object({
    repository: schema.string(),
    snapshot: schema.string(),
  });

  // GET one snapshot
  router.get(
    {
      path: addBasePath('snapshots/{repository}/{snapshot}'),
      validate: { params: getOneParamsSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = ctx.core.elasticsearch;
      const { repository, snapshot } = req.params as TypeOf<typeof getOneParamsSchema>;
      const managedRepository = await getManagedRepositoryName(clusterClient.asCurrentUser);

      try {
        const response = await clusterClient.asCurrentUser.snapshot.get({
          repository,
          snapshot: '_all',
          ignore_unavailable: true,
        });

        const { snapshots: snapshotsList } = response.body;

        if (!snapshotsList || snapshotsList.length === 0) {
          return res.notFound({ body: 'Snapshot not found' });
        }

        const selectedSnapshot = snapshotsList.find(
          ({ snapshot: snapshotName }) => snapshot === snapshotName
        ) as SnapshotDetailsEs;

        if (!selectedSnapshot) {
          // If snapshot doesn't exist, manually throw 404 here
          return res.notFound({ body: 'Snapshot not found' });
        }

        const successfulSnapshots = snapshotsList
          .filter(({ state }) => state === 'SUCCESS')
          .sort((a, b) => {
            return +new Date(b.end_time!) - +new Date(a.end_time!);
          }) as SnapshotDetailsEs[];

        return res.ok({
          body: deserializeSnapshotDetails(
            selectedSnapshot,
            managedRepository,
            successfulSnapshots
          ),
        });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );

  const deleteSchema = schema.arrayOf(
    schema.object({
      repository: schema.string(),
      snapshot: schema.string(),
    })
  );

  // DELETE one or multiple snapshots
  router.post(
    { path: addBasePath('snapshots/bulk_delete'), validate: { body: deleteSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = ctx.core.elasticsearch;

      const response: {
        itemsDeleted: Array<{ snapshot: string; repository: string }>;
        errors: any[];
      } = {
        itemsDeleted: [],
        errors: [],
      };

      const snapshots = req.body;

      try {
        // We intentially perform deletion requests sequentially (blocking) instead of in parallel (non-blocking)
        // because there can only be one snapshot deletion task performed at a time (ES restriction).
        for (let i = 0; i < snapshots.length; i++) {
          const { snapshot, repository } = snapshots[i];

          await clusterClient.asCurrentUser.snapshot
            .delete({ snapshot, repository })
            .then(() => response.itemsDeleted.push({ snapshot, repository }))
            .catch((e: any) =>
              response.errors.push({
                id: { snapshot, repository },
                error: wrapEsError(e),
              })
            );
        }

        return res.ok({ body: response });
      } catch (e) {
        return handleEsError({ error: e, response: res });
      }
    })
  );
}
