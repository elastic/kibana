/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { SnapshotDetailsEs } from '../../../common/types';
import { deserializeSnapshotDetails, convertSortFieldToES } from '../../../common/lib';
import type { RouteDependencies } from '../../types';
import { getManagedRepositoryName } from '../../lib';
import { addBasePath } from '../helpers';

const querySchema = schema.object({
  sortField: schema.oneOf([
    schema.literal('snapshot'),
    schema.literal('repository'),
    schema.literal('indices'),
    schema.literal('durationInMillis'),
    schema.literal('startTimeInMillis'),
    schema.literal('shards.total'),
    schema.literal('shards.failed'),
  ]),
  sortDirection: schema.oneOf([schema.literal('desc'), schema.literal('asc')]),
  pageIndex: schema.number(),
  pageSize: schema.number(),
});

export function registerSnapshotsRoutes({
  router,
  license,
  lib: { wrapEsError, handleEsError },
}: RouteDependencies) {
  // GET all snapshots
  router.get(
    { path: addBasePath('snapshots'), validate: { query: querySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { client: clusterClient } = ctx.core.elasticsearch;
      const sortField = convertSortFieldToES((req.query as TypeOf<typeof querySchema>).sortField);
      const sortDirection = (req.query as TypeOf<typeof querySchema>).sortDirection;
      const pageIndex = (req.query as TypeOf<typeof querySchema>).pageIndex;
      const pageSize = (req.query as TypeOf<typeof querySchema>).pageSize;

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
          order: sortDirection,
          sort: sortField,
          size: pageSize,
          offset: pageIndex * pageSize,
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
            // @ts-expect-error @elastic/elasticsearch "total" is a new field in the response
            total: fetchedSnapshots?.total,
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
            .catch((e) =>
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
