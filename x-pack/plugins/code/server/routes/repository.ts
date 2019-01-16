/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { Server } from 'hapi';
import { isValidGitUrl } from '../../common/git_url_utils';
import { RepositoryUtils } from '../../common/repository_utils';
import { RepositoryConfig } from '../../model';
import { RepositoryIndexInitializer, RepositoryIndexInitializerFactory } from '../indexer';
import { Log } from '../log';
import { CloneWorker, DeleteWorker, IndexWorker } from '../queue';
import { RepositoryConfigController } from '../repository_config_controller';
import { RepositoryObjectClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';

export function repositoryRoute(
  server: Server,
  cloneWorker: CloneWorker,
  deleteWorker: DeleteWorker,
  indexWorker: IndexWorker,
  repoIndexInitializerFactory: RepositoryIndexInitializerFactory,
  repoConfigController: RepositoryConfigController
) {
  // Clone a git repository
  server.securedRoute({
    path: '/api/code/repo',
    requireAdmin: true,
    method: 'POST',
    async handler(req, h) {
      const repoUrl: string = (req.payload as any).url;
      const log = new Log(req.server);

      // Reject the request if the url is an invalid git url.
      if (!isValidGitUrl(repoUrl)) {
        return Boom.badRequest('Invalid git url.');
      }

      const repo = RepositoryUtils.buildRepository(repoUrl);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));

      try {
        // Check if the repository already exists
        await repoObjectClient.getRepository(repo.uri);
        const msg = `Repository ${repoUrl} already exists. Skip clone.`;
        log.info(msg);
        return h.response(msg).code(304); // Not Modified
      } catch (error) {
        log.info(`Repository ${repoUrl} does not exist. Go ahead with clone.`);
        try {
          // Create the index for the repository
          const initializer = repoIndexInitializerFactory.create(
            repo.uri,
            ''
          ) as RepositoryIndexInitializer;
          await initializer.init();

          // Persist to elasticsearch
          await repoObjectClient.setRepository(repo.uri, repo);

          // Kick off clone job
          const payload = {
            url: repoUrl,
          };
          await cloneWorker.enqueueJob(payload, {});
          return repo;
        } catch (error) {
          const msg = `Issue repository clone request for ${repoUrl} error: ${error}`;
          log.error(msg);
          return Boom.badRequest(msg);
        }
      }
    },
  });

  // Remove a git repository
  server.securedRoute({
    path: '/api/code/repo/{uri*3}',
    requireAdmin: true,
    method: 'DELETE',
    async handler(req, h) {
      const repoUri: string = req.params.uri as string;
      const log = new Log(req.server);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
      try {
        // Check if the repository already exists. If not, an error will be thrown.
        await repoObjectClient.getRepository(repoUri);

        // Check if the repository delete status already exists. If so, we should ignore this
        // request.
        try {
          await repoObjectClient.getRepositoryDeleteStatus(repoUri);
          const msg = `Repository ${repoUri} is already in delete.`;
          log.info(msg);
          return h.response(msg).code(304); // Not Modified
        } catch (error) {
          // Do nothing here since this error is expected.
          log.info(`Repository ${repoUri} delete status does not exist. Go ahead with delete.`);
        }

        const payload = {
          uri: repoUri,
        };
        await deleteWorker.enqueueJob(payload, {});

        return {};
      } catch (error) {
        const msg = `Issue repository delete request for ${repoUri} error: ${error}`;
        log.error(msg);
        return Boom.notFound(msg);
      }
    },
  });

  // Get a git repository
  server.route({
    path: '/api/code/repo/{uri*3}',
    method: 'GET',
    async handler(req) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        return await repoObjectClient.getRepository(repoUri);
      } catch (error) {
        const msg = `Get repository ${repoUri} error: ${error}`;
        log.error(msg);
        return Boom.notFound(msg);
      }
    },
  });

  server.route({
    path: '/api/code/repo/status/{uri*3}',
    method: 'GET',
    async handler(req) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        let gitStatus = null;
        try {
          gitStatus = await repoObjectClient.getRepositoryGitStatus(repoUri);
        } catch (error) {
          log.error(`Get repository git status ${repoUri} error: ${error}`);
        }

        let indexStatus = null;
        try {
          indexStatus = await repoObjectClient.getRepositoryLspIndexStatus(repoUri);
        } catch (error) {
          log.error(`Get repository index status ${repoUri} error: ${error}`);
        }

        let deleteStatus = null;
        try {
          deleteStatus = await repoObjectClient.getRepositoryDeleteStatus(repoUri);
        } catch (error) {
          log.error(`Get repository delete status ${repoUri} error: ${error}`);
        }
        return {
          gitStatus,
          indexStatus,
          deleteStatus,
        };
      } catch (error) {
        const msg = `Get repository status ${repoUri} error: ${error}`;
        log.error(msg);
        return Boom.notFound(msg);
      }
    },
  });

  // Get all git repositories
  server.route({
    path: '/api/code/repos',
    method: 'GET',
    async handler(req) {
      const log = new Log(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        return await repoObjectClient.getAllRepositories();
      } catch (error) {
        const msg = `Get all repositories error: ${error}`;
        log.error(msg);
        return Boom.notFound(msg);
      }
    },
  });

  // Issue a repository index task.
  // TODO(mengwei): This is just temporary API stub to trigger the index job. Eventually in the near
  // future, this route will be removed. The scheduling strategy is still in discussion.
  server.route({
    path: '/api/code/repo/index/{uri*3}',
    method: 'POST',
    async handler(req) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        const cloneStatus = await repoObjectClient.getRepositoryGitStatus(repoUri);

        const payload = {
          uri: repoUri,
          revision: cloneStatus.revision,
        };
        await indexWorker.enqueueJob(payload, {});
        return {};
      } catch (error) {
        const msg = `Index repository ${repoUri} error: ${error}`;
        log.error(msg);
        return Boom.notFound(msg);
      }
    },
  });

  // Update a repo config
  server.route({
    path: '/api/code/repo/config/{uri*3}',
    method: 'PUT',
    async handler(req, h) {
      const config: RepositoryConfig = req.payload as RepositoryConfig;
      const repoUrl: string = config.uri;

      const log = new Log(req.server);

      // Reject the request if the url is an invalid git url.
      if (!isValidGitUrl(repoUrl)) {
        return Boom.badRequest(`Invalid git url: ${repoUrl}`);
      }

      const repo = RepositoryUtils.buildRepository(repoUrl);
      const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));

      try {
        // Check if the repository exists
        await repoObjectClient.getRepository(repo.uri);
      } catch (error) {
        const msg = `Repository not existed for ${repoUrl}`;
        log.error(msg);
        return Boom.badRequest(msg);
      }

      try {
        // Persist to elasticsearch
        await repoObjectClient.setRepositoryConfig(repo.uri, config);
        repoConfigController.resetConfigCache(repo.uri);
        return {};
      } catch (error) {
        const msg = `Issue repository clone request for ${repoUrl} error: ${error}`;
        log.error(msg);
        return Boom.badRequest(msg);
      }
    },
  });

  // Get repository config
  server.route({
    path: '/api/code/repo/config/{uri*3}',
    method: 'GET',
    async handler(req) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      try {
        const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));
        return await repoObjectClient.getRepositoryConfig(repoUri);
      } catch (error) {
        const msg = `Get repository config ${repoUri} error: ${error}`;
        log.error(msg);
        return Boom.notFound(msg);
      }
    },
  });
}
