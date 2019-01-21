/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Indexer, IndexerFactory, LspIndexer } from '.';
import { RepositoryUri } from '../../model';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';

export class LspIndexerFactory implements IndexerFactory {
  constructor(
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {}

  public create(repoUri: RepositoryUri, revision: string): Indexer {
    return new LspIndexer(repoUri, revision, this.lspService, this.options, this.client, this.log);
  }
}
