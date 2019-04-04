/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';

export function registerSnapshotsRoutes(router: Router) {
  router.get('snapshots', getAllHandler);
  router.get('snapshots/{repository}/{snapshot}', getOneHandler);
}

export async function getAllHandler(req, callWithRequest): RouterRouteHandler {
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });

  const repositoryNames = Object.keys(repositoriesByName);

  if (repositoryNames.length === 0) {
    return [];
  }

  const snapshotsRequests = repositoryNames.map(repositoryName => {
    return callWithRequest('cat.snapshots', {
      repository: repositoryName,
      format: 'json',
    })
      .then(snapshots => {
        // Decorate each snapshot with the repository with which it's associated.
        return snapshots.map(snapshot => ({
          repository: repositoryName,
          ...snapshot,
        }));
      })
      .catch(error => {
        // These errors are commonly due to a misconfiguration in the repository or plugin errors,
        // which can result in a variety of 400, 404, and 500 errors.
        return error;
      });
  });

  const arraysOfSnapshotsAndErrors = await Promise.all(snapshotsRequests);

  // Multiple repositories can have identical configurations. This means that the same snapshot
  // may be listed as belonging to multiple repositories. We need to dedupe the snapshots and
  // aggregate the repositories with which each is associated.
  const idToSnapshotMap = {};
  const errors = [];

  arraysOfSnapshotsAndErrors.forEach(arrayOfSnapshotsOrError => {
    const isError = !Array.isArray(arrayOfSnapshotsOrError);

    if (isError) {
      errors.push(arrayOfSnapshotsOrError);
      return;
    }

    arrayOfSnapshotsOrError.forEach(snapshot => {
      const { id, repository, ...rest } = snapshot;

      if (!idToSnapshotMap[id]) {
        // Create the snapshot if it doesn't exist.
        idToSnapshotMap[id] = {
          id,
          ...rest,
          repositories: [repository], // Store its repository.
        };
      } else {
        // If it already exists, just store the repository.
        idToSnapshotMap[id].repositories.push(repository);
      }
    });
  });

  return {
    snapshots: Object.values(idToSnapshotMap),
    errors,
  };
}

export async function getOneHandler(req, callWithRequest): RouterRouteHandler {
  const { repository, snapshot } = req.params;
  const { snapshots } = await callWithRequest('snapshot.get', { repository, snapshot });
  // If the snapshot is missing the endpoint will return a 404, so we'll never get to this point.
  return {
    repository,
    ...snapshots[0],
  };
}
