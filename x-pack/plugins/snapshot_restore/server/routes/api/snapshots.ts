/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { Snapshot, SnapshotDetails } from '../../../common/types';
import { deserializeSnapshotDetails, deserializeSnapshotSummary } from '../../lib';
import { SnapshotDetailsEs, SnapshotSummaryEs } from '../../types';

export function registerSnapshotsRoutes(router: Router) {
  router.get('snapshots', getAllHandler);
  router.get('snapshots/{repository}/{snapshot}', getOneHandler);
}

export const getAllHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  snapshots: Snapshot[];
  errors: any[];
}> => {
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });

  const repositoryNames = Object.keys(repositoriesByName);

  if (repositoryNames.length === 0) {
    return { snapshots: [], errors: [] };
  }

  const errors: any = [];

  const fetchSnapshotsForRepository = async (repositoryName: string) => {
    try {
      const snapshots = await callWithRequest('cat.snapshots', {
        repository: repositoryName,
        format: 'json',
      });

      // Decorate each snapshot with the repository with which it's associated.
      return snapshots.map((snapshot: any) => ({
        repository: repositoryName,
        ...snapshot,
      }));
    } catch (error) {
      // These errors are commonly due to a misconfiguration in the repository or plugin errors,
      // which can result in a variety of 400, 404, and 500 errors.
      errors.push(error);
      return null;
    }
  };

  const repositoriesSnapshots = await Promise.all(repositoryNames.map(fetchSnapshotsForRepository));

  // Multiple repositories can have identical configurations. This means that the same snapshot
  // may be listed as belonging to multiple repositories. A map lets us dedupe the snapshots and
  // aggregate the repositories that are associated with each one.
  const idToSnapshotMap: Record<string, Snapshot> = repositoriesSnapshots
    .filter(Boolean)
    .reduce((idToSnapshot, snapshots: SnapshotSummaryEs[]) => {
      // create an object to store each snapshot and the
      // repositories that are associated with it.
      snapshots.forEach(summary => {
        const { id, repository } = summary;

        if (!idToSnapshot[id]) {
          // Instantiate the snapshot object
          idToSnapshot[id] = {
            id,
            // The cat API only returns a subset of the details returned by the get snapshot API.
            summary: deserializeSnapshotSummary(summary),
            repositories: [],
          };
        }

        idToSnapshot[id].repositories.push(repository);
      });

      return idToSnapshot;
    }, {});

  return {
    snapshots: Object.values(idToSnapshotMap),
    errors,
  };
};

export const getOneHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<SnapshotDetails> => {
  const { repository, snapshot } = req.params;
  const { snapshots }: { snapshots: SnapshotDetailsEs[] } = await callWithRequest('snapshot.get', {
    repository,
    snapshot,
  });

  // If the snapshot is missing the endpoint will return a 404, so we'll never get to this point.
  return deserializeSnapshotDetails(snapshots[0]);
};
