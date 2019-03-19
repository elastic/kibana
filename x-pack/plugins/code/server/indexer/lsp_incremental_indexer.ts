/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import util from 'util';

import { ProgressReporter } from '.';
import { toCanonicalUrl } from '../../common/uri_util';
import { Document, IndexStats, IndexStatsKey, LspIndexRequest, RepositoryUri } from '../../model';
import { GitOperations } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { detectLanguage, detectLanguageByFilename } from '../utils/detect_language';
import {
  getDocumentIndexCreationRequest,
  getReferenceIndexCreationRequest,
  getSymbolIndexCreationRequest,
} from './index_creation_request';
import { LspIndexer } from './lsp_indexer';
import { ALL_RESERVED, DocumentIndexName, ReferenceIndexName, SymbolIndexName } from './schema';

export class LspIncrementalIndexer extends LspIndexer {
  protected type: string = 'lsp_inc';

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    super(repoUri, revision, lspService, options, client, log);
  }

  protected async prepareIndexCreationRequests() {
    // We don't need to create new indices for incremental indexing.
    return [];
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<LspIndexRequest> {
    // TODO: implement this
    yield* super.getIndexRequestIterator();
  }

  protected async getIndexRequestCount(): Promise<number> {
    try {
      const gitOperator = new GitOperations(this.options.repoPath);
      return await gitOperator.countRepoFiles(this.repoUri, 'head');
    } catch (error) {
      this.log.error(`Get lsp index requests count error.`);
      this.log.error(error);
      throw error;
    }
  }

  protected async cleanIndex() {
    this.log.info('Do not need to clean index for incremental indexing.');
  }
}
