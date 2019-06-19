/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import util from 'util';

import { ProgressReporter } from '.';
import { Diff, DiffKind } from '../../common/git_diff';
import { toCanonicalUrl } from '../../common/uri_util';
import {
  Document,
  IndexStats,
  IndexStatsKey,
  LspIncIndexRequest,
  RepositoryUri,
} from '../../model';
import { GitOperations } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { detectLanguage } from '../utils/detect_language';
import { LspIndexer } from './lsp_indexer';
import { DocumentIndexName, ReferenceIndexName, SymbolIndexName } from './schema';

export class LspIncrementalIndexer extends LspIndexer {
  protected type: string = 'lsp_inc';
  private diff: Diff | undefined = undefined;

  constructor(
    protected readonly repoUri: RepositoryUri,
    // The latest revision to be indexed
    protected readonly revision: string,
    // The already indexed revision
    protected readonly originRevision: string,
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly gitOps: GitOperations,
    protected readonly client: EsClient,
    protected readonly log: Logger
  ) {
    super(repoUri, revision, lspService, options, gitOps, client, log);
  }

  public async start(progressReporter?: ProgressReporter, checkpointReq?: LspIncIndexRequest) {
    return await super.start(progressReporter, checkpointReq);
  }

  // If the current checkpoint is valid. Otherwise, ignore the checkpoint
  protected validateCheckpoint(checkpointReq?: LspIncIndexRequest): boolean {
    return (
      checkpointReq !== undefined &&
      checkpointReq.revision === this.revision &&
      checkpointReq.originRevision === this.originRevision
    );
  }

  // If it's necessary to refresh (create and reset) all the related indices
  protected needRefreshIndices(_: LspIncIndexRequest): boolean {
    return false;
  }

  protected ifCheckpointMet(req: LspIncIndexRequest, checkpointReq: LspIncIndexRequest): boolean {
    // Assume for the same revision pair, the order of the files we iterate the diff is definite
    // everytime.
    return (
      req.filePath === checkpointReq.filePath &&
      req.revision === checkpointReq.revision &&
      req.originRevision === checkpointReq.originRevision &&
      req.kind === checkpointReq.kind
    );
  }

  protected async prepareIndexCreationRequests() {
    // We don't need to create new indices for incremental indexing.
    return [];
  }

  protected async processRequest(request: LspIncIndexRequest): Promise<IndexStats> {
    const stats: IndexStats = new Map<IndexStatsKey, number>()
      .set(IndexStatsKey.Symbol, 0)
      .set(IndexStatsKey.Reference, 0)
      .set(IndexStatsKey.File, 0)
      .set(IndexStatsKey.SymbolDeleted, 0)
      .set(IndexStatsKey.ReferenceDeleted, 0)
      .set(IndexStatsKey.FileDeleted, 0);
    if (this.isCancelled()) {
      this.log.debug(`Incremental indexer is cancelled. Skip.`);
      return stats;
    }

    const { kind } = request;

    this.log.debug(`Index ${kind} request ${JSON.stringify(request, null, 2)}`);
    switch (kind) {
      case DiffKind.ADDED: {
        await this.handleAddedRequest(request, stats);
        break;
      }
      case DiffKind.DELETED: {
        await this.handleDeletedRequest(request, stats);
        break;
      }
      case DiffKind.MODIFIED: {
        await this.handleModifiedRequest(request, stats);
        break;
      }
      case DiffKind.RENAMED: {
        await this.handleRenamedRequest(request, stats);
        break;
      }
      default: {
        this.log.debug(
          `Unsupported diff kind ${kind} for incremental indexing. Skip this request.`
        );
      }
    }

    return stats;
  }

  protected async *getIndexRequestIterator(): AsyncIterableIterator<LspIncIndexRequest> {
    try {
      const { workspaceRepo } = await this.lspService.workspaceHandler.openWorkspace(
        this.repoUri,
        'head'
      );
      const workspaceDir = workspaceRepo.workdir();
      if (this.diff) {
        for (const f of this.diff.files) {
          yield {
            repoUri: this.repoUri,
            localRepoPath: workspaceDir,
            filePath: f.path,
            originPath: f.originPath,
            revision: this.revision,
            kind: f.kind,
            originRevision: this.originRevision,
          };
        }
      }
    } catch (error) {
      this.log.error(`Get lsp incremental index requests count error.`);
      this.log.error(error);
      throw error;
    }
  }

  protected async getIndexRequestCount(): Promise<number> {
    try {
      // cache here to avoid pulling the diff twice.
      this.diff = await this.gitOps.getDiff(this.repoUri, this.originRevision, this.revision);
      return this.diff.files.length;
    } catch (error) {
      this.log.error(`Get lsp incremental index requests count error.`);
      this.log.error(error);
      throw error;
    }
  }

  protected async cleanIndex() {
    this.log.info('Do not need to clean index for incremental indexing.');
  }

  private async handleAddedRequest(request: LspIncIndexRequest, stats: IndexStats) {
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

      if (response && response.result.length > 0) {
        const { symbols, references } = response.result[0];
        for (const symbol of symbols) {
          await this.lspBatchIndexHelper.index(SymbolIndexName(repoUri), symbol);
          symbolNames.add(symbol.symbolInformation.name);
        }
        stats.set(IndexStatsKey.Symbol, symbols.length);

        for (const ref of references) {
          await this.lspBatchIndexHelper.index(ReferenceIndexName(repoUri), ref);
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
    await this.docBatchIndexHelper.index(DocumentIndexName(repoUri), body);
    stats.set(IndexStatsKey.File, 1);
  }

  private async handleDeletedRequest(request: LspIncIndexRequest, stats: IndexStats) {
    const { revision, filePath, repoUri } = request;

    // Delete the document with the exact file path. TODO: add stats
    const docRes = await this.client.deleteByQuery({
      index: DocumentIndexName(repoUri),
      body: {
        query: {
          term: {
            'path.hierarchy': filePath,
          },
        },
      },
    });
    if (docRes) {
      stats.set(IndexStatsKey.FileDeleted, docRes.deleted);
    }

    const lspDocUri = toCanonicalUrl({ repoUri, revision, file: filePath, schema: 'git:' });

    // Delete all symbols within this file
    const symbolRes = await this.client.deleteByQuery({
      index: SymbolIndexName(repoUri),
      body: {
        query: {
          term: {
            'symbolInformation.location.uri': lspDocUri,
          },
        },
      },
    });
    if (symbolRes) {
      stats.set(IndexStatsKey.SymbolDeleted, symbolRes.deleted);
    }

    // TODO: When references is enabled. Clean up the references as well.
  }

  private async handleModifiedRequest(request: LspIncIndexRequest, stats: IndexStats) {
    const { kind, originRevision, originPath, repoUri, localRepoPath } = request;

    // 1. first delete all related indexed data
    await this.handleDeletedRequest(
      {
        repoUri,
        localRepoPath,
        revision: originRevision,
        filePath: originPath ? originPath : '',
        kind,
        originRevision,
      },
      stats
    );
    // 2. index data with modified version
    await this.handleAddedRequest(request, stats);
  }

  private async handleRenamedRequest(request: LspIncIndexRequest, stats: IndexStats) {
    // Do the same as modified file
    await this.handleModifiedRequest(request, stats);
  }
}
