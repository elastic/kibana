/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Indexer, IndexerFactory, RepositoryIndexInitializer } from '.';
import { RepositoryUri } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Log } from '../log';

export class RepositoryIndexInitializerFactory implements IndexerFactory {
  constructor(protected readonly client: EsClient, protected readonly log: Log) {}

  public create(repoUri: RepositoryUri, revision: string): Indexer {
    return new RepositoryIndexInitializer(repoUri, revision, this.client, this.log);
  }
}
