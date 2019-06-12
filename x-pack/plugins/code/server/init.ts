/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import crypto from 'crypto';
import { Server } from 'hapi';
import * as _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { XPackMainPlugin } from '../../xpack_main/xpack_main';
import { checkRepos } from './check_repos';
import { GitOperations } from './git_operations';
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
import { EsClientWithInternalRequest } from './utils/esclient_with_internal_request';
import { checkCodeNode, checkRoute } from './routes/check';

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

export function init(server: Server, options: any) {
  if (!options.ui.enabled) {
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
    const codeNodeUrl = serverOptions.codeNodeUrl;
    const rndString = crypto.randomBytes(20).toString('hex');
    checkRoute(server, rndString);
    if (codeNodeUrl) {
      const checkResult = await retryUntilAvailable(
        async () => await checkCodeNode(codeNodeUrl, log, rndString),
        5000
      );
      if (checkResult.me) {
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
  // wait until elasticsearch is ready
  // @ts-ignore
  await server.plugins.elasticsearch.waitUntilReady();

  log.info('Initializing Code plugin as code-node.');
  const queueIndex: string = server.config().get('xpack.code.queueIndex');
  const queueTimeoutMs: number = server.config().get('xpack.code.queueTimeoutMs');
  const devMode: boolean = server.config().get('env.dev');

  const esClient: EsClient = new EsClientWithInternalRequest(server);
  const repoConfigController = new RepositoryConfigController(esClient);

  server.injectUiAppVars('code', () => ({
    enableLangserversDeveloping: devMode,
  }));
  // Enable the developing language servers in development mode.
  if (devMode === true) {
    LanguageServers.push(...LanguageServersDeveloping);
    const JavaLanguageServer = LanguageServers.find(d => d.name === 'Java');
    JavaLanguageServer!.downloadUrl = _.partialRight(JavaLanguageServer!.downloadUrl!, devMode);
  }

  // Initialize git operations
  const gitOps = new GitOperations(serverOptions.repoPath);

  const installManager = new InstallManager(server, serverOptions);
  const lspService = new LspService(
    '127.0.0.1',
    serverOptions,
    gitOps,
    esClient,
    installManager,
    new ServerLoggerFactory(server),
    repoConfigController
  );
  server.events.on('stop', async () => {
    log.debug('shutdown lsp process');
    await lspService.shutdown();
  });
  // Initialize indexing factories.
  const lspIndexerFactory = new LspIndexerFactory(lspService, serverOptions, gitOps, esClient, log);

  const repoIndexInitializerFactory = new RepositoryIndexInitializerFactory(esClient, log);

  // Initialize queue worker cancellation service.
  const cancellationService = new CancellationSerivce();

  // Execute index version checking and try to migrate index data if necessary.
  await tryMigrateIndices(esClient, log);

  // Initialize queue.
  const queue = new Esqueue(queueIndex, {
    client: esClient,
    timeout: queueTimeoutMs,
  });
  const indexWorker = new IndexWorker(
    queue,
    log,
    esClient,
    [lspIndexerFactory],
    gitOps,
    cancellationService
  ).bind();

  const repoServiceFactory: RepositoryServiceFactory = new RepositoryServiceFactory();

  const cloneWorker = new CloneWorker(
    queue,
    log,
    esClient,
    serverOptions,
    gitOps,
    indexWorker,
    repoServiceFactory,
    cancellationService
  ).bind();
  const deleteWorker = new DeleteWorker(
    queue,
    log,
    esClient,
    serverOptions,
    gitOps,
    cancellationService,
    lspService,
    repoServiceFactory
  ).bind();
  const updateWorker = new UpdateWorker(
    queue,
    log,
    esClient,
    serverOptions,
    gitOps,
    repoServiceFactory,
    cancellationService
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
  fileRoute(codeServerRouter, gitOps);
  workspaceRoute(codeServerRouter, serverOptions, gitOps);
  symbolByQnameRoute(codeServerRouter, log);
  installRoute(codeServerRouter, lspService);
  lspRoute(codeServerRouter, lspService, serverOptions);
  setupRoute(codeServerRouter);

  server.events.on('stop', () => {
    gitOps.cleanAllRepo();
    if (!serverOptions.disableIndexScheduler) {
      indexScheduler.stop();
    }
    updateScheduler.stop();
    queue.destroy();
  });
}
