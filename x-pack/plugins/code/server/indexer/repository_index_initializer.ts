/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { AbstractIndexer } from './abstract_indexer';
import { IndexCreationRequest } from './index_creation_request';
import { RepositoryAnalysisSettings, RepositoryIndexName, RepositorySchema } from './schema';

// Inherit AbstractIndexer's index creation logics. This is not an actual indexer.
export class RepositoryIndexInitializer extends AbstractIndexer {
  protected type: string = 'repository';

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    super(repoUri, revision, client, log);
  }

  public async prepareIndexCreationRequests() {
    const creationReq: IndexCreationRequest = {
      index: RepositoryIndexName(this.repoUri),
      settings: {
        ...RepositoryAnalysisSettings,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: RepositorySchema,
    };
    return [creationReq];
  }

  public async init() {
    const res = await this.prepareIndex();
    if (!res) {
      this.log.error(`Initialize repository index failed.`);
    }
    return;
  }
}
