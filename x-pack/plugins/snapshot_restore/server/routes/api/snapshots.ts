/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';

import { Snapshot, SnapshotDetails } from '../../../common/types';

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

  const fetchSnapshotsForRepository = (repositoryName: string) =>
    callWithRequest('cat.snapshots', {
      repository: repositoryName,
      format: 'json',
    })
      .then(snapshots => {
        // Decorate each snapshot with the repository with which it's associated.
        return snapshots.map((snapshot: any) => ({
          repository: repositoryName,
          ...snapshot,
        }));
      })
      // These errors are commonly due to a misconfiguration in the repository or plugin errors,
      // which can result in a variety of 400, 404, and 500 errors.
      .catch(error => error);

  const arraysOfSnapshotsAndErrors = await Promise.all(
    repositoryNames.map(fetchSnapshotsForRepository)
  );

  // Multiple repositories can have identical configurations. This means that the same snapshot
  // may be listed as belonging to multiple repositories. A map lets us dedupe the snapshots and
  // aggregate the repositories that are associated with each one.
  const idToSnapshotMap: any = {};
  const errors: any = [];

  arraysOfSnapshotsAndErrors.forEach(arrayOfSnapshotsOrError => {
    const isError = !Array.isArray(arrayOfSnapshotsOrError);

    // If it's an error we just need to store it and return it.
    if (isError) {
      errors.push(arrayOfSnapshotsOrError);
      return;
    }

    // If it's an array of snapshots, we'll create an object to store each snapshot and the
    // repositories that are associated with it.
    arrayOfSnapshotsOrError.forEach((snapshot: any) => {
      const { id, repository, ...rest } = snapshot;

      if (!idToSnapshotMap[id]) {
        // Create the snapshot object if it doesn't exist.
        idToSnapshotMap[id] = {
          id,
          // The cat API only returns a subset of the details returned by the get snapshot API.
          summary: { ...rest },
          repositories: [repository], // Associate the repository with it.
        };
      } else {
        // If it already exists, just associate the repository with it.
        idToSnapshotMap[id].repositories.push(repository);
      }
    });
  });

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
  const { snapshots } = await callWithRequest('snapshot.get', { repository, snapshot });
  // If the snapshot is missing the endpoint will return a 404, so we'll never get to this point.
  return snapshots[0];
};
