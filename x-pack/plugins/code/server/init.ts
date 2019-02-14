/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { checkRepos } from './check_repos';
import { CodeNodeClient, CodeNodeInfo } from './code_node_client';
import { LspIndexerFactory, RepositoryIndexInitializerFactory, tryMigrateIndices } from './indexer';
import { EsClient, Esqueue } from './lib/esqueue';
import { Logger } from './log';
import { InstallManager } from './lsp/install_manager';
import { LanguageServers, LanguageServersDeveloping } from './lsp/language_servers';
import { LspService } from './lsp/lsp_service';
import { CancellationSerivce, CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './queue';
import { RepositoryConfigController } from './repository_config_controller';
import { RepositoryServiceFactory } from './repository_service_factory';
import { clusterRoute } from './routes/cluster';
import { fileRoute } from './routes/file';
import { installRoute } from './routes/install';
import { lspRoute, symbolByQnameRoute } from './routes/lsp';
import { redirectRoute } from './routes/redirect';
import { redirectSocketRoute } from './routes/redirect_socket';
import { repositoryRoute } from './routes/repository';
import { documentSearchRoute, repositorySearchRoute, symbolSearchRoute } from './routes/search';
import { setupRoute } from './routes/setup';
import { socketRoute } from './routes/socket';
import { workspaceRoute } from './routes/workspace';
import { IndexScheduler, UpdateScheduler } from './scheduler';
import { enableSecurity } from './security';
import { ServerOptions } from './server_options';
import { SocketService } from './socket_service';
import { ServerLoggerFactory } from './utils/server_logger_factory';

async function retryUntilAvailable<T>(
  func: () => Promise<T>,
  intervalMs: number,
  retries: number = Number.MAX_VALUE
): Promise<T> {
  const value = await func();
  if (value) {
    return value;
  } else {
    const promise = new Promise<T>(resolve => {
      const retry = () => {
        func().then(v => {
          if (v) {
            resolve(v);
          } else {
            retries--;
            if (retries > 0) {
              setTimeout(retry, intervalMs);
            } else {
              resolve(v);
            }
          }
        });
      };
      setTimeout(retry, intervalMs);
    });
    return await promise;
  }
}

function getServerUuid(server: Server): Promise<string> {
  const uid = server.config().get('server.uuid') as string;
  return Promise.resolve(uid);
}

export function init(server: Server, options: any) {
  const log = new Logger(server);
  const serverOptions = new ServerOptions(options, server.config());
  // @ts-ignore
  const kbnServer = this.kbnServer;
  kbnServer.ready().then(async () => {
    const serverUuid = await retryUntilAvailable(() => getServerUuid(server), 50);
    const codeNodeClient = new CodeNodeClient(server);
    // enable security check in routes
    enableSecurity(server);
    // enable cluster status routes
    clusterRoute(server, codeNodeClient, log);
    if (serverOptions.codeNode) {
      let info = await codeNodeClient.getCodeNodeInfo();
      if (!info) {
        let url: string = server.info.uri;
        const serverHost = server.config().get('server.host');
        if (serverHost !== undefined && serverHost !== 'localhost') {
          const serverPort = server.config().get('server.port');
          const schema = server.config().get('server.ssl.enabled') ? 'https' : 'http';
          let basePath: string = server.config().get('server.basePath') || '';
          if (!basePath.startsWith('/')) {
            basePath = '/' + basePath;
          }
          url = `${schema}://${serverHost}:${serverPort}}${basePath}`;
        }
        info = await codeNodeClient.createNodeInfo({
          uuid: serverUuid,
          url,
        });
      }
      if (info.uuid === serverUuid) {
        await initCodeNode(server, serverOptions, log);
      } else {
        log.error(
          `a code node with a different uuid ${
            info.uuid
          } already exists, please check your configuration.`
        );
        await initNonCodeNode(info, server, serverOptions, log);
      }
    } else {
      const info = await retryUntilAvailable(
        async () => await codeNodeClient.getCodeNodeInfo(),
        50
      );
      await initNonCodeNode(info!, server, serverOptions, log);
    }
  });
}

async function initNonCodeNode(
  info: CodeNodeInfo,
  server: Server,
  serverOptions: ServerOptions,
  log: Logger
) {
  log.info(
    `Initializing Code plugin as non-code node, redirecting all code requests to ${info.url}`
  );

  redirectRoute(server, info.url, log);
  await redirectSocketRoute(server, info.url, log);
}

async function initCodeNode(server: Server, serverOptions: ServerOptions, log: Logger) {
  log.info('Initializing Code plugin as code-node.');
  const queueIndex: string = server.config().get('xpack.code.queueIndex');
  const queueTimeout: number = server.config().get('xpack.code.queueTimeout');
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');

  const socketService = new SocketService(server, log);

  // @ts-ignore
  const esClient: EsClient = adminCluster.getClient();
  const repoConfigController = new RepositoryConfigController(esClient);

  // Enable the developing language servers in development mode.
  if (server.config().get('env.dev') === true) {
    LanguageServers.push(...LanguageServersDeveloping);
  }

  const installManager = new InstallManager(server, serverOptions);
  const lspService = new LspService(
    '127.0.0.1',
    serverOptions,
    esClient,
    installManager,
    new ServerLoggerFactory(server),
    repoConfigController
  );
  // Initialize indexing factories.
  const lspIndexerFactory = new LspIndexerFactory(lspService, serverOptions, esClient, log);

  const repoIndexInitializerFactory = new RepositoryIndexInitializerFactory(esClient, log);

  // Initialize queue worker cancellation service.
  const cancellationService = new CancellationSerivce();

  // Execute index version checking and try to migrate index data if necessary.
  await tryMigrateIndices(esClient, log);

  // Initialize queue.
  const queue = new Esqueue(queueIndex, {
    client: esClient,
    timeout: queueTimeout,
  });
  const indexWorker = new IndexWorker(
    queue,
    log,
    esClient,
    [lspIndexerFactory],
    cancellationService,
    socketService
  ).bind();

  const repoServiceFactory: RepositoryServiceFactory = new RepositoryServiceFactory();

  const cloneWorker = new CloneWorker(
    queue,
    log,
    esClient,
    serverOptions,
    indexWorker,
    repoServiceFactory,
    socketService
  ).bind();
  const deleteWorker = new DeleteWorker(
    queue,
    log,
    esClient,
    serverOptions,
    cancellationService,
    lspService,
    repoServiceFactory,
    socketService
  ).bind();
  const updateWorker = new UpdateWorker(
    queue,
    log,
    esClient,
    serverOptions,
    repoServiceFactory
  ).bind();

  // Initialize schedulers.
  const updateScheduler = new UpdateScheduler(updateWorker, serverOptions, esClient, log);
  const indexScheduler = new IndexScheduler(indexWorker, serverOptions, esClient, log);
  if (!serverOptions.disableScheduler) {
    updateScheduler.start();
    indexScheduler.start();
  }
  // check code node repos on disk
  await checkRepos(cloneWorker, esClient, serverOptions, log);
  // Add server routes and initialize the plugin here
  repositoryRoute(
    server,
    cloneWorker,
    deleteWorker,
    indexWorker,
    repoIndexInitializerFactory,
    repoConfigController
  );
  repositorySearchRoute(server, log);
  documentSearchRoute(server, log);
  symbolSearchRoute(server, log);
  fileRoute(server, serverOptions);
  workspaceRoute(server, serverOptions);
  symbolByQnameRoute(server, log);
  socketRoute(server, socketService, log);
  installRoute(server, socketService, lspService, installManager, serverOptions);
  lspRoute(server, lspService, serverOptions);
  setupRoute(server);
}
