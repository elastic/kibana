/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeOf } from '@kbn/config-schema';

import { DEFAULT_REPOSITORY_TYPES, REPOSITORY_PLUGINS_MAP } from '../../../common/constants';
import { Repository, RepositoryType, SlmPolicyEs } from '../../../common/types';
import { RouteDependencies } from '../../types';
import { addBasePath } from '../helpers';
import { nameParameterSchema, repositorySchema } from './validate_schemas';

import {
  deserializeRepositorySettings,
  serializeRepositorySettings,
  getManagedRepositoryName,
} from '../../lib';

interface ManagedRepository {
  name?: string;
  policy?: string;
}

export function registerRepositoriesRoutes({
  router,
  license,
  config: { isCloudEnabled },
  lib: { isEsError, wrapEsError },
}: RouteDependencies) {
  // GET all repositories
  router.get(
    { path: addBasePath('repositories'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const managedRepositoryName = await getManagedRepositoryName(callAsCurrentUser);

      let repositoryNames: string[] | undefined;
      let repositories: Repository[];
      let managedRepository: ManagedRepository;

      try {
        const repositoriesByName = await callAsCurrentUser('snapshot.getRepository', {
          repository: '_all',
        });
        repositoryNames = Object.keys(repositoriesByName);
        repositories = repositoryNames.map((name) => {
          const { type = '', settings = {} } = repositoriesByName[name];
          return {
            name,
            type,
            settings: deserializeRepositorySettings(settings),
          };
        });

        managedRepository = {
          name: managedRepositoryName,
        };
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

      // If a managed repository, we also need to check if a policy is associated to it
      if (managedRepositoryName) {
        try {
          const policiesByName: {
            [key: string]: SlmPolicyEs;
          } = await callAsCurrentUser('sr.policies', {
            human: true,
          });

          const managedRepositoryPolicy = Object.entries(policiesByName)
            .filter(([, data]) => {
              const { policy } = data;
              return policy.repository === managedRepositoryName;
            })
            .flat();

          const [policyName] = managedRepositoryPolicy;

          managedRepository.policy = policyName as ManagedRepository['name'];
        } catch (e) {
          // swallow error for now
          // we don't want to block repositories from loading if request fails
        }
      }

      return res.ok({ body: { repositories, managedRepository } });
    })
  );

  // GET one repository
  router.get(
    { path: addBasePath('repositories/{name}'), validate: { params: nameParameterSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;

      const managedRepository = await getManagedRepositoryName(callAsCurrentUser);

      let repositoryByName: any;

      try {
        repositoryByName = await callAsCurrentUser('snapshot.getRepository', {
          repository: name,
        });
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

      const {
        responses: snapshotResponses,
      }: {
        responses: Array<{
          repository: string;
          snapshots: any[];
        }>;
      } = await callAsCurrentUser('snapshot.get', {
        repository: name,
        snapshot: '_all',
      }).catch((e) => ({
        responses: [
          {
            snapshots: null,
          },
        ],
      }));

      if (repositoryByName[name]) {
        const { type = '', settings = {} } = repositoryByName[name];

        return res.ok({
          body: {
            repository: {
              name,
              type,
              settings: deserializeRepositorySettings(settings),
            },
            isManagedRepository: managedRepository === name,
            snapshots: {
              count:
                snapshotResponses && snapshotResponses[0] && snapshotResponses[0].snapshots
                  ? snapshotResponses[0].snapshots.length
                  : null,
            },
          },
        });
      }

      return res.ok({
        body: {
          repository: {},
          snapshots: {},
        },
      });
    })
  );

  // GET repository types
  router.get(
    { path: addBasePath('repository_types'), validate: false },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      // In ECE/ESS, do not enable the default types
      const types: RepositoryType[] = isCloudEnabled ? [] : [...DEFAULT_REPOSITORY_TYPES];

      try {
        // Call with internal user so that the requesting user does not need `monitoring` cluster
        // privilege just to see list of available repository types
        const plugins: any[] = await callAsCurrentUser('cat.plugins', { format: 'json' });

        // Filter list of plugins to repository-related ones
        if (plugins && plugins.length) {
          const pluginNames: string[] = [...new Set(plugins.map((plugin) => plugin.component))];
          pluginNames.forEach((pluginName) => {
            if (REPOSITORY_PLUGINS_MAP[pluginName]) {
              types.push(REPOSITORY_PLUGINS_MAP[pluginName]);
            }
          });
        }
        return res.ok({ body: types });
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

  // Verify repository
  router.get(
    {
      path: addBasePath('repositories/{name}/verify'),
      validate: { params: nameParameterSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;

      try {
        const verificationResults = await callAsCurrentUser('snapshot.verifyRepository', {
          repository: name,
        }).catch((e) => ({
          valid: false,
          error: e.response ? JSON.parse(e.response) : e,
        }));

        return res.ok({
          body: {
            verification: verificationResults.error
              ? verificationResults
              : {
                  valid: true,
                  response: verificationResults,
                },
          },
        });
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

  // Cleanup repository
  router.post(
    {
      path: addBasePath('repositories/{name}/cleanup'),
      validate: { params: nameParameterSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;

      try {
        const cleanupResults = await callAsCurrentUser('sr.cleanupRepository', {
          name,
        }).catch((e) => ({
          cleaned: false,
          error: e.response ? JSON.parse(e.response) : e,
        }));

        return res.ok({
          body: {
            cleanup: cleanupResults.error
              ? cleanupResults
              : {
                  cleaned: true,
                  response: cleanupResults,
                },
          },
        });
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

  // Create repository
  router.put(
    { path: addBasePath('repositories'), validate: { body: repositorySchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name = '', type = '', settings = {} } = req.body as TypeOf<typeof repositorySchema>;

      // Check that repository with the same name doesn't already exist
      try {
        const repositoryByName = await callAsCurrentUser('snapshot.getRepository', {
          repository: name,
        });
        if (repositoryByName[name]) {
          return res.conflict({ body: 'There is already a repository with that name.' });
        }
      } catch (e) {
        // Silently swallow errors
      }

      // Otherwise create new repository
      try {
        const response = await callAsCurrentUser('snapshot.createRepository', {
          repository: name,
          body: {
            type,
            settings: serializeRepositorySettings(settings),
          },
          verify: false,
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

  // Update repository
  router.put(
    {
      path: addBasePath('repositories/{name}'),
      validate: { body: repositorySchema, params: nameParameterSchema },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;
      const { type = '', settings = {} } = req.body as TypeOf<typeof repositorySchema>;

      try {
        // Check that repository with the given name exists
        // If it doesn't exist, 404 will be thrown by ES and will be returned
        await callAsCurrentUser('snapshot.getRepository', { repository: name });

        // Otherwise update repository
        const response = await callAsCurrentUser('snapshot.createRepository', {
          repository: name,
          body: {
            type,
            settings: serializeRepositorySettings(settings),
          },
          verify: false,
        });

        return res.ok({
          body: response,
        });
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

  // Delete repository
  router.delete(
    { path: addBasePath('repositories/{name}'), validate: { params: nameParameterSchema } },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.snapshotRestore!.client;
      const { name } = req.params as TypeOf<typeof nameParameterSchema>;
      const repositoryNames = name.split(',');

      const response: { itemsDeleted: string[]; errors: any[] } = {
        itemsDeleted: [],
        errors: [],
      };

      try {
        await Promise.all(
          repositoryNames.map((repoName) => {
            return callAsCurrentUser('snapshot.deleteRepository', { repository: repoName })
              .then(() => response.itemsDeleted.push(repoName))
              .catch((e) =>
                response.errors.push({
                  name: repoName,
                  error: wrapEsError(e),
                })
              );
          })
        );

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
