/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { RepositoryUri, WorkerReservedProgress } from '../../model';
import { WorkerProgress, WorkerResult } from '../../model/repository';
import { DocumentIndexName, ReferenceIndexName, SymbolIndexName } from '../indexer/schema';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { RepositoryObjectClient } from '../search';
import { ServerOptions } from '../server_options';
import { SocketService } from '../socket_service';
import { AbstractWorker } from './abstract_worker';
import { CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class DeleteWorker extends AbstractWorker {
  public id: string = 'delete';
  private objectClient: RepositoryObjectClient;

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly client: EsClient,
    protected readonly serverOptions: ServerOptions,
    private readonly cancellationService: CancellationSerivce,
    private readonly lspService: LspService,
    private readonly repoServiceFactory: RepositoryServiceFactory,
    private readonly socketService: SocketService
  ) {
    super(queue, log);
    this.objectClient = new RepositoryObjectClient(this.client);
  }

  public async executeJob(job: Job) {
    const { uri } = job.payload;

    // 1. Notify repo delete start through websocket.
    this.socketService.broadcastDeleteProgress(uri, WorkerReservedProgress.INIT);

    // 2. Cancel running workers
    // TODO: Add support for clone/update worker.
    this.cancellationService.cancelIndexJob(uri);

    // 3. Delete repository on local fs.
    const repoService = this.repoServiceFactory.newInstance(this.serverOptions.repoPath, this.log);
    const deleteRepoPromise = this.deletePromiseWrapper(repoService.remove(uri), 'git data', uri);

    // 4. Delete ES indices and aliases
    const deleteSymbolESIndexPromise = this.deletePromiseWrapper(
      this.client.indices.delete({ index: `${SymbolIndexName(uri)}*` }),
      'symbol ES index',
      uri
    );

    const deleteReferenceESIndexPromise = this.deletePromiseWrapper(
      this.client.indices.delete({ index: `${ReferenceIndexName(uri)}*` }),
      'reference ES index',
      uri
    );

    const deleteWorkspacePromise = this.deletePromiseWrapper(
      this.lspService.deleteWorkspace(uri),
      'workspace',
      uri
    );

    try {
      await Promise.all([
        deleteRepoPromise,
        deleteSymbolESIndexPromise,
        deleteReferenceESIndexPromise,
        deleteWorkspacePromise,
      ]);

      // 5. Notify repo delete end through websocket.
      this.socketService.broadcastDeleteProgress(uri, WorkerReservedProgress.COMPLETED);

      // 6. Delete the document index and alias where the repository document and all status reside,
      // so that you won't be able to import the same repositories until they are
      // fully removed.
      await this.deletePromiseWrapper(
        this.client.indices.delete({ index: `${DocumentIndexName(uri)}*` }),
        'document ES index',
        uri
      );

      return {
        uri,
        res: true,
      };
    } catch (error) {
      this.log.error(`Delete repository ${uri} error.`);
      this.log.error(error);
      // Notify repo delete failed through websocket.
      this.socketService.broadcastDeleteProgress(uri, WorkerReservedProgress.ERROR);
      return {
        uri,
        res: false,
      };
    }
  }

  public async onJobEnqueued(job: Job) {
    const repoUri = job.payload.uri;
    const progress: WorkerProgress = {
      uri: repoUri,
      progress: WorkerReservedProgress.INIT,
      timestamp: new Date(),
    };
    return await this.objectClient.setRepositoryDeleteStatus(repoUri, progress);
  }

  public async onJobCompleted(_: Job, res: WorkerResult) {
    this.log.info(`Delete job ${this.id} completed with result ${JSON.stringify(res)}`);
    // Don't update the delete progress anymore.
    return new Promise<WorkerResult>((resolve, reject) => {
      resolve();
    });
  }

  public async updateProgress(uri: string, progress: number) {
    const p: WorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
    };
    return await this.objectClient.updateRepositoryDeleteStatus(uri, p);
  }

  protected getTimeoutMs(_: any) {
    return (
      moment.duration(1, 'hour').asMilliseconds() + moment.duration(10, 'minutes').asMilliseconds()
    );
  }

  private deletePromiseWrapper(
    promise: Promise<any>,
    type: string,
    repoUri: RepositoryUri
  ): Promise<any> {
    return promise
      .then(() => {
        this.log.info(`Delete ${type} of repository ${repoUri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete ${type} of repository ${repoUri} error.`);
        this.log.error(error);
      });
  }
}
