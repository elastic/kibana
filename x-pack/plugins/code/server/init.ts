/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import fetch from 'node-fetch';
import { i18n } from '@kbn/i18n';
import { XPackMainPlugin } from '../../xpack_main/xpack_main';
import { checkRepos } from './check_repos';
import { LspIndexerFactory, RepositoryIndexInitializerFactory, tryMigrateIndices } from './indexer';
import { EsClient, Esqueue } from './lib/esqueue';
import { Logger } from './log';
import { InstallManager } from './lsp/install_manager';
import { LanguageServers, LanguageServersDeveloping } from './lsp/language_servers';
import { LspService } from './lsp/lsp_service';
import { CancellationSerivce, CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './queue';
import { RepositoryConfigController } from './repository_config_controller';
import { RepositoryServiceFactory } from './repository_service_factory';
import { fileRoute } from './routes/file';
import { installRoute } from './routes/install';
import { lspRoute, symbolByQnameRoute } from './routes/lsp';
import { redirectRoute } from './routes/redirect';
import { repositoryRoute } from './routes/repository';
import { documentSearchRoute, repositorySearchRoute, symbolSearchRoute } from './routes/search';
import { setupRoute } from './routes/setup';
import { workspaceRoute } from './routes/workspace';
import { IndexScheduler, UpdateScheduler } from './scheduler';
import { CodeServerRouter } from './security';
import { ServerOptions } from './server_options';
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

async function getCodeNodeUuid(url: string, log: Logger) {
  const res = await fetch(`${url}/api/stats`, {});
  if (res.ok) {
    return (await res.json()).kibana.uuid;
  }

  log.info(`Access code node ${url} failed, try again later.`);
  return null;
}

export function init(server: Server, options: any) {
  if (!options.enabled) {
    return;
  }

  const log = new Logger(server);
  const serverOptions = new ServerOptions(options, server.config());
  const xpackMainPlugin: XPackMainPlugin = server.plugins.xpack_main;
  xpackMainPlugin.registerFeature({
    id: 'code',
    name: i18n.translate('xpack.code.featureRegistry.codeFeatureName', {
      defaultMessage: 'Code',
    }),
    icon: 'codeApp',
    navLinkId: 'code',
    app: ['code', 'kibana'],
    catalogue: [], // TODO add catalogue here
    privileges: {
      all: {
        api: ['code_user', 'code_admin'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show', 'user', 'admin'],
      },
      read: {
        api: ['code_user'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show', 'user'],
      },
    },
  });

  // @ts-ignore
  const kbnServer = this.kbnServer;
  kbnServer.ready().then(async () => {
    const serverUuid = await retryUntilAvailable(() => getServerUuid(server), 50);
    // enable security check in routes
    const codeNodeUrl = serverOptions.codeNodeUrl;
    if (codeNodeUrl) {
      const codeNodeUuid = (await retryUntilAvailable(
        async () => await getCodeNodeUuid(codeNodeUrl, log),
        5000
      )) as string;
      if (codeNodeUuid === serverUuid) {
        await initCodeNode(server, serverOptions, log);
      } else {
        await initNonCodeNode(codeNodeUrl, server, serverOptions, log);
      }
    } else {
      // codeNodeUrl not set, single node mode
      await initCodeNode(server, serverOptions, log);
    }
  });
}

async function initNonCodeNode(
  url: string,
  server: Server,
  serverOptions: ServerOptions,
  log: Logger
) {
  log.info(`Initializing Code plugin as non-code node, redirecting all code requests to ${url}`);
  redirectRoute(server, url, log);
}

async function initCodeNode(server: Server, serverOptions: ServerOptions, log: Logger) {
  log.info('Initializing Code plugin as code-node.');
  const queueIndex: string = server.config().get('xpack.code.queueIndex');
  const queueTimeout: number = server.config().get('xpack.code.queueTimeout');
  const devMode: boolean = server.config().get('env.dev');
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');

  // @ts-ignore
  const esClient: EsClient = adminCluster.clusterClient.client;
  const repoConfigController = new RepositoryConfigController(esClient);

  server.injectUiAppVars('code', () => ({
    enableLangserversDeveloping: devMode,
  }));
  // Enable the developing language servers in development mode.
  if (devMode === true) {
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
    serverOptions,
    cancellationService
  ).bind();

  const repoServiceFactory: RepositoryServiceFactory = new RepositoryServiceFactory();

  const cloneWorker = new CloneWorker(
    queue,
    log,
    esClient,
    serverOptions,
    indexWorker,
    repoServiceFactory
  ).bind();
  const deleteWorker = new DeleteWorker(
    queue,
    log,
    esClient,
    serverOptions,
    cancellationService,
    lspService,
    repoServiceFactory
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
  updateScheduler.start();
  if (!serverOptions.disableIndexScheduler) {
    indexScheduler.start();
  }
  // check code node repos on disk
  await checkRepos(cloneWorker, esClient, serverOptions, log);

  const codeServerRouter = new CodeServerRouter(server);
  // Add server routes and initialize the plugin here
  repositoryRoute(
    codeServerRouter,
    cloneWorker,
    deleteWorker,
    indexWorker,
    repoIndexInitializerFactory,
    repoConfigController,
    serverOptions
  );
  repositorySearchRoute(codeServerRouter, log);
  documentSearchRoute(codeServerRouter, log);
  symbolSearchRoute(codeServerRouter, log);
  fileRoute(codeServerRouter, serverOptions);
  workspaceRoute(codeServerRouter, serverOptions);
  symbolByQnameRoute(codeServerRouter, log);
  installRoute(codeServerRouter, lspService);
  lspRoute(codeServerRouter, lspService, serverOptions);
  setupRoute(codeServerRouter);

  server.events.on('stop', () => {
    if (!serverOptions.disableIndexScheduler) {
      indexScheduler.stop();
    }
    updateScheduler.stop();
    queue.destroy();
  });
}
