/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { wrapCustomError } from '../../../../../server/lib/create_router/error_wrappers';
import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
import { Repository, RepositoryType, RepositoryVerification } from '../../../common/types';

export function registerRepositoriesRoutes(router: Router) {
  router.get('repository_types', getTypesHandler);
  router.get('repositories', getAllHandler);
  router.get('repositories/{name}', getOneHandler);
  router.put('repositories', createHandler);
  router.put('repositories/{name}', updateHandler);
}

export const getAllHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  repositories: Repository[];
  verification: { [key: string]: RepositoryVerification };
}> => {
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });
  const repositoryNames = Object.keys(repositoriesByName);
  const repositories: Repository[] = repositoryNames.map(name => {
    return {
      name,
      ...repositoriesByName[name],
    };
  });
  const repositoryVerification = await Promise.all([
    ...repositoryNames.map(name => {
      return callWithRequest('snapshot.verifyRepository', { repository: name }).catch(e => ({
        valid: false,
        error: e.response ? JSON.parse(e.response) : e,
      }));
    }),
  ]);
  return {
    repositories,
    verification: repositoryNames.reduce(
      (acc: { [key: string]: RepositoryVerification }, name, index) => {
        const verificationResults = repositoryVerification[index];
        acc[name] = verificationResults.error
          ? verificationResults
          : {
              valid: true,
              response: verificationResults,
            };
        return acc;
      },
      {}
    ),
  };
};

export const getOneHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  repository: Repository | {};
  verification: RepositoryVerification | {};
}> => {
  const { name } = req.params;
  const repositoryByName = await callWithRequest('snapshot.getRepository', { repository: name });
  const verificationResults = await callWithRequest('snapshot.verifyRepository', {
    repository: name,
  }).catch(e => ({
    valid: false,
    error: e.response ? JSON.parse(e.response) : e,
  }));

  if (repositoryByName[name]) {
    return {
      repository: {
        name,
        ...repositoryByName[name],
      },
      verification: verificationResults.error
        ? verificationResults
        : {
            valid: true,
            response: verificationResults,
          },
    };
  } else {
    return {
      repository: {},
      verification: {},
    };
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

export const createHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name, ...rest } = req.payload as Repository;
  const conflictError = wrapCustomError(
    new Error('There is already a repository with that name.'),
    409
  );

  // Check that repository with the same name doesn't already exist
  try {
    const repositoryByName = await callWithRequest('snapshot.getRepository', { repository: name });
    if (repositoryByName[name]) {
      throw conflictError;
    }
  } catch (e) {
    // Rethrow conflict error but silently swallow all others
    if (e === conflictError) {
      throw e;
    }
  }

  // Otherwise create new repository
  return await callWithRequest('snapshot.createRepository', {
    repository: name,
    body: rest,
    verify: false,
  });
};

export const updateHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const { name: repositoryName, ...rest } = req.payload as Repository;

  // Check that repository with the given name exists
  // If it doesn't exist, 404 will be thrown by ES and will be returned
  await callWithRequest('snapshot.getRepository', { repository: name });

  // Otherwise update repository
  return await callWithRequest('snapshot.createRepository', {
    repository: name,
    body: rest,
    verify: false,
  });
};
