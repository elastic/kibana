/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
import { RepositoryType } from '../../../common/types';

export function registerRepositoriesRoutes(router: Router) {
  router.get('repository_types', getTypesHandler);
  router.get('repositories', getAllHandler);
  router.get('repositories/{name}', getOneHandler);
}

export const getAllHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });
  const repositories = Object.keys(repositoriesByName).map(name => {
    return {
      name,
      ...repositoriesByName[name],
    };
  });
  return repositories;
};

export const getOneHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const repositoryByName = await callWithRequest('snapshot.getRepository', { repository: name });
  if (repositoryByName[name]) {
    return {
      name,
      ...repositoryByName[name],
    };
  } else {
    return {};
  }
};

export const getTypesHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const types: RepositoryType[] = [...DEFAULT_REPOSITORY_TYPES];
  const plugins: any[] = await callWithRequest('cat.plugins', { format: 'json' });
  if (plugins && plugins.length) {
    const pluginNames: string[] = [...new Set(plugins.map(plugin => plugin.component))];
    pluginNames.forEach(pluginName => {
      if (REPOSITORY_PLUGINS_MAP[pluginName]) {
        types.push(REPOSITORY_PLUGINS_MAP[pluginName]);
      }
    });
  }
  return types;
};
