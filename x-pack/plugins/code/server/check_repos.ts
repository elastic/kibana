/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { RepositoryUtils } from '../common/repository_utils';
import { EsClient } from './lib/esqueue';
import { Logger } from './log';
import { CloneWorker } from './queue';
import { RepositoryObjectClient } from './search';
import { ServerOptions } from './server_options';

export async function checkRepos(
  cloneWorker: CloneWorker,
  esClient: EsClient,
  serverOptions: ServerOptions,
  log: Logger
) {
  log.info('Check repositories on local disk.');
  const repoObjectClient = new RepositoryObjectClient(esClient);
  const repos = await repoObjectClient.getAllRepositories();
  for (const repo of repos) {
    try {
      const path = RepositoryUtils.repositoryLocalPath(serverOptions.repoPath, repo.uri);
      if (!fs.existsSync(path)) {
        log.info(`can't find ${repo.uri} on local disk, cloning from remote.`);
        const payload = {
          url: repo.url,
        };
        await cloneWorker.enqueueJob(payload, {});
      }
    } catch (e) {
      log.error(e);
    }
  }
}
