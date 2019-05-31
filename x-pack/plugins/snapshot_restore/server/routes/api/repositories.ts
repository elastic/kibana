/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import {
  wrapCustomError,
  wrapEsError,
} from '../../../../../server/lib/create_router/error_wrappers';

import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
import { Repository, RepositoryType, RepositoryVerification } from '../../../common/types';

import { Plugins } from '../../../shim';
import { deserializeRepositorySettings, serializeRepositorySettings } from '../../lib';

let isCloudEnabled: boolean = false;
let callWithInternalUser: any;

export function registerRepositoriesRoutes(router: Router, plugins: Plugins) {
  isCloudEnabled = plugins.cloud.config.isCloudEnabled;
  callWithInternalUser = plugins.elasticsearch.getCluster('data').callWithInternalUser;
  router.get('repository_types', getTypesHandler);
  router.get('repositories', getAllHandler);
  router.get('repositories/{name}', getOneHandler);
  router.get('repositories/{name}/verify', getVerificationHandler);
  router.put('repositories', createHandler);
  router.put('repositories/{name}', updateHandler);
  router.delete('repositories/{names}', deleteHandler);
}

export const getManagedRepositoryName = async () => {
  const { persistent, transient, defaults } = await callWithInternalUser('cluster.getSettings', {
    filterPath: '*.*managed_repository',
    flatSettings: true,
    includeDefaults: true,
  });
  const { 'cluster.metadata.managed_repository': managedRepositoryName = undefined } = {
    ...defaults,
    ...persistent,
    ...transient,
  };
  return managedRepositoryName;
};

export const getAllHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  repositories: Repository[];
  managedRepository?: string;
}> => {
  const managedRepository = await getManagedRepositoryName();
  const repositoriesByName = await callWithRequest('snapshot.getRepository', {
    repository: '_all',
  });
  const repositoryNames = Object.keys(repositoriesByName);
  const repositories: Repository[] = repositoryNames.map(name => {
    const { type = '', settings = {} } = repositoriesByName[name];
    return {
      name,
      type,
      settings: deserializeRepositorySettings(settings),
    };
  });
  return { repositories, managedRepository };
};

export const getOneHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  repository: Repository | {};
  isManagedRepository?: boolean;
  snapshots: { count: number | undefined } | {};
}> => {
  const { name } = req.params;
  const managedRepository = await getManagedRepositoryName();
  const repositoryByName = await callWithRequest('snapshot.getRepository', { repository: name });
  const { snapshots } = await callWithRequest('snapshot.get', {
    repository: name,
    snapshot: '_all',
  }).catch(e => ({
    snapshots: null,
  }));

  if (repositoryByName[name]) {
    const { type = '', settings = {} } = repositoryByName[name];
    return {
      repository: {
        name,
        type,
        settings: deserializeRepositorySettings(settings),
      },
      isManagedRepository: managedRepository === name,
      snapshots: {
        count: snapshots ? snapshots.length : null,
      },
    };
  } else {
    return {
      repository: {},
      snapshots: {},
    };
  }
};

export const getVerificationHandler: RouterRouteHandler = async (
  req,
  callWithRequest
): Promise<{
  verification: RepositoryVerification | {};
}> => {
  const { name } = req.params;
  const verificationResults = await callWithRequest('snapshot.verifyRepository', {
    repository: name,
  }).catch(e => ({
    valid: false,
    error: e.response ? JSON.parse(e.response) : e,
  }));
  return {
    verification: verificationResults.error
      ? verificationResults
      : {
          valid: true,
          response: verificationResults,
        },
  };
};

export const getTypesHandler: RouterRouteHandler = async () => {
  // In ECE/ESS, do not enable the default types
  const types: RepositoryType[] = isCloudEnabled ? [] : [...DEFAULT_REPOSITORY_TYPES];

  // Call with internal user so that the requesting user does not need `monitoring` cluster
  // privilege just to see list of available repository types
  const plugins: any[] = await callWithInternalUser('cat.plugins', { format: 'json' });

  // Filter list of plugins to repository-related ones
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
  const { name = '', type = '', settings = {} } = req.payload as Repository;
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
    body: {
      type,
      settings: serializeRepositorySettings(settings),
    },
    verify: false,
  });
};

export const updateHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { name } = req.params;
  const { type = '', settings = {} } = req.payload as Repository;

  // Check that repository with the given name exists
  // If it doesn't exist, 404 will be thrown by ES and will be returned
  await callWithRequest('snapshot.getRepository', { repository: name });

  // Otherwise update repository
  return await callWithRequest('snapshot.createRepository', {
    repository: name,
    body: {
      type,
      settings: serializeRepositorySettings(settings),
    },
    verify: false,
  });
};

export const deleteHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { names } = req.params;
  const repositoryNames = names.split(',');
  const response: { itemsDeleted: string[]; errors: any[] } = {
    itemsDeleted: [],
    errors: [],
  };

  await Promise.all(
    repositoryNames.map(name => {
      return callWithRequest('snapshot.deleteRepository', { repository: name })
        .then(() => response.itemsDeleted.push(name))
        .catch(e =>
          response.errors.push({
            name,
            error: wrapEsError(e),
          })
        );
    })
  );

  return response;
};
