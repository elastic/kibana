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
import { AbstractIndexer } from './abstract_indexer';
import { BatchIndexHelper } from './batch_index_helper';
import {
  getDocumentIndexCreationRequest,
  getReferenceIndexCreationRequest,
  getSymbolIndexCreationRequest,
} from './index_creation_request';
import { ALL_RESERVED, DocumentIndexName, ReferenceIndexName, SymbolIndexName } from './schema';

export class LspIndexer extends AbstractIndexer {
  protected type: string = 'lsp';
  protected batchIndexHelper: BatchIndexHelper;

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    super(repoUri, revision, client, log);

    this.batchIndexHelper = new BatchIndexHelper(client, log);
  }

  public async start(progressReporter?: ProgressReporter, checkpointReq?: LspIndexRequest) {
    try {
      return await super.start(progressReporter, checkpointReq);
    } finally {
      if (!this.isCancelled()) {
        // Flush all the index request still in the cache for bulk index.
        this.batchIndexHelper.flush();
      }
    }
  }

  public cancel() {
    this.batchIndexHelper.cancel();
    super.cancel();
  }

  // If the current checkpoint is valid
  protected validateCheckpoint(checkpointReq?: LspIndexRequest): boolean {
    return checkpointReq !== undefined && checkpointReq.revision === this.revision;
  }

  // If it's necessary to refresh (create and reset) all the related indices
  protected needRefreshIndices(checkpointReq?: LspIndexRequest): boolean {
    // If it's not resumed from a checkpoint, then try to refresh all the indices.
    return !this.validateCheckpoint(checkpointReq);
  }

  protected ifCheckpointMet(req: LspIndexRequest, checkpointReq: LspIndexRequest): boolean {
    // Assume for the same revision, the order of the files we iterate the repository is definite
    // everytime.
    return req.filePath === checkpointReq.filePath && req.revision === checkpointReq.revision;
  }

  protected async prepareIndexCreationRequests() {
    return [
      getDocumentIndexCreationRequest(this.repoUri),
      getReferenceIndexCreationRequest(this.repoUri),
      getSymbolIndexCreationRequest(this.repoUri),
    ];
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<LspIndexRequest> {
    try {
      const {
        workspaceRepo,
        workspaceRevision,
      } = await this.lspService.workspaceHandler.openWorkspace(this.repoUri, 'head');
      const workspaceDir = workspaceRepo.workdir();
      const gitOperator = new GitOperations(this.options.repoPath);
      const fileIterator = await gitOperator.iterateRepo(this.repoUri, 'head');
      for await (const file of fileIterator) {
        const filePath = file.path!;
        const lang = detectLanguageByFilename(filePath);
        // filter file by language
        if (lang && this.lspService.supportLanguage(lang)) {
          const req: LspIndexRequest = {
            repoUri: this.repoUri,
            localRepoPath: workspaceDir,
            filePath,
            revision: workspaceRevision,
          };
          yield req;
        }
      }
    } catch (error) {
      this.log.error(`Prepare lsp indexing requests error.`);
      this.log.error(error);
      throw error;
    }
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
    // Clean up all the symbol documents in the symbol index
    try {
      await this.client.deleteByQuery({
        index: SymbolIndexName(this.repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up symbols for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up symbols for ${this.repoUri} error.`);
      this.log.error(error);
    }

    // Clean up all the reference documents in the reference index
    try {
      await this.client.deleteByQuery({
        index: ReferenceIndexName(this.repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up references for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up references for ${this.repoUri} error.`);
      this.log.error(error);
    }

    // Clean up all the document documents in the document index but keep the repository document.
    try {
      await this.client.deleteByQuery({
        index: DocumentIndexName(this.repoUri),
        body: {
          query: {
            bool: {
              must_not: ALL_RESERVED.map((field: string) => ({
                exists: {
                  field,
                },
              })),
            },
          },
        },
      });
      this.log.info(`Clean up documents for ${this.repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up documents for ${this.repoUri} error.`);
      this.log.error(error);
    }
  }

  protected async processRequest(request: LspIndexRequest): Promise<IndexStats> {
    const stats: IndexStats = new Map<IndexStatsKey, number>()
      .set(IndexStatsKey.Symbol, 0)
      .set(IndexStatsKey.Reference, 0)
      .set(IndexStatsKey.File, 0);
    const { repoUri, revision, filePath, localRepoPath } = request;
    const lspDocUri = toCanonicalUrl({ repoUri, revision, file: filePath, schema: 'git:' });
    const symbolNames = new Set<string>();

    try {
      const response = await this.lspService.sendRequest('textDocument/full', {
        textDocument: {
          uri: lspDocUri,
        },
        reference: this.options.enableGlobalReference,
      });

      if (response && response.result && response.result.length > 0 && response.result[0]) {
        const { symbols, references } = response.result[0];
        for (const symbol of symbols) {
          await this.batchIndexHelper.index(SymbolIndexName(repoUri), symbol);
          symbolNames.add(symbol.symbolInformation.name);
        }
        stats.set(IndexStatsKey.Symbol, symbols.length);

        for (const ref of references) {
          await this.batchIndexHelper.index(ReferenceIndexName(repoUri), ref);
        }
        stats.set(IndexStatsKey.Reference, references.length);
      } else {
        this.log.debug(`Empty response from lsp server. Skip symbols and references indexing.`);
      }
    } catch (error) {
      this.log.error(`Index symbols or references error. Skip to file indexing.`);
      this.log.error(error);
    }

    const localFilePath = `${localRepoPath}${filePath}`;
    const lstat = util.promisify(fs.lstat);
    const stat = await lstat(localFilePath);

    const readLink = util.promisify(fs.readlink);
    const readFile = util.promisify(fs.readFile);
    const content = stat.isSymbolicLink()
      ? await readLink(localFilePath, 'utf8')
      : await readFile(localFilePath, 'utf8');

    const language = await detectLanguage(filePath, Buffer.from(content));
    const body: Document = {
      repoUri,
      path: filePath,
      content,
      language,
      qnames: Array.from(symbolNames),
    };
    await this.batchIndexHelper.index(DocumentIndexName(repoUri), body);
    stats.set(IndexStatsKey.File, 1);
    return stats;
  }
}
