/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';

export function registerRepositoriesRoutes(router: Router) {
  router.get('repositories', getAllHandler);
  router.get('repositories/{name}', getOneHandler);
}

const getAllHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });
  const repositories = Object.keys(repositoriesByName).map(name => {
    return {
      name,
      test: repositoriesByName[name],
    };
  });
  return repositories;
};

const getOneHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const repositoryByName = await callWithRequest('snapshot.getRepository', { repository: name });
  if (repositoryByName[name]) {
    return repositoryByName[name];
  } else {
    return {};
  }
};
