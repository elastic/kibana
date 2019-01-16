/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import moment from 'moment';
import { resolve } from 'path';

import {
  LspIndexerFactory,
  RepositoryIndexInitializerFactory,
  tryMigrateIndices,
} from './server/indexer';
import { EsClient, Esqueue } from './server/lib/esqueue';
import { Log } from './server/log';
import { InstallManager } from './server/lsp/install_manager';
import { LspService } from './server/lsp/lsp_service';
import {
  CancellationSerivce,
  CloneWorker,
  DeleteWorker,
  IndexWorker,
  UpdateWorker,
} from './server/queue';
import { RepositoryConfigController } from './server/repository_config_controller';
import { RepositoryServiceFactory } from './server/repository_service_factory';
import { fileRoute } from './server/routes/file';
import { installRoute } from './server/routes/install';
import { lspRoute, symbolByQnameRoute } from './server/routes/lsp';
import { redirectRoute } from './server/routes/redirect';
import { redirectSocketRoute } from './server/routes/redirect_socket';
import { repositoryRoute } from './server/routes/repository';
import {
  documentSearchRoute,
  repositorySearchRoute,
  symbolSearchRoute,
} from './server/routes/search';
import { socketRoute } from './server/routes/socket';
import { userRoute } from './server/routes/user';
import { workspaceRoute } from './server/routes/workspace';
import { IndexScheduler, UpdateScheduler } from './server/scheduler';
import { enableSecurity } from './server/security';
import { ServerOptions } from './server/server_options';
import { SocketService } from './server/socket_service';
import { ServerLoggerFactory } from './server/utils/server_logger_factory';

// tslint:disable-next-line no-default-export
export const code = (kibana: any) =>
  new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: 'code',
    configPrefix: 'xpack.code',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: 'Code',
        description: 'Code Search Plugin',
        main: 'plugins/code/app',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        queueIndex: Joi.string().default('.code-worker-queue'),
        // 1 hour by default.
        queueTimeout: Joi.number().default(moment.duration(1, 'hour').asMilliseconds()),
        // The frequency which update scheduler executes. 5 minutes by default.
        updateFrequencyMs: Joi.number().default(moment.duration(5, 'minute').asMilliseconds()),
        // The frequency which index scheduler executes. 1 day by default.
        indexFrequencyMs: Joi.number().default(moment.duration(1, 'day').asMilliseconds()),
        // The frequency which each repo tries to update. 1 hour by default.
        updateRepoFrequencyMs: Joi.number().default(moment.duration(1, 'hour').asMilliseconds()),
        // The frequency which each repo tries to index. 1 day by default.
        indexRepoFrequencyMs: Joi.number().default(moment.duration(1, 'day').asMilliseconds()),
        // timeout a request over 30s.
        lspRequestTimeoutMs: Joi.number().default(moment.duration(10, 'second').asMilliseconds()),
        repos: Joi.array().default([]),
        maxWorkspace: Joi.number().default(5), // max workspace folder for each language server
        isAdmin: Joi.boolean().default(true), // If we show the admin buttons
        disableScheduler: Joi.boolean().default(true), // Temp option to disable all schedulers.
        enableGlobalReference: Joi.boolean().default(false), // Global reference as optional feature for now
        redirectToNode: Joi.string(),
      }).default();
    },

    init: async (server: Server, options: any) => {
      const queueIndex: string = server.config().get('xpack.code.queueIndex');
      const queueTimeout: number = server.config().get('xpack.code.queueTimeout');
      const adminCluster = server.plugins.elasticsearch.getCluster('admin');
      const log = new Log(server);
      const serverOptions = new ServerOptions(options, server.config());

      if (serverOptions.redirectToNode) {
        log.info(
          `redirect node enabled,all requests will be redirected to ${serverOptions.redirectToNode}`
        );
        redirectRoute(server, options, log);
        await redirectSocketRoute(server, options, log);
        return;
      }
      // enable security check in routes
      enableSecurity(server);

      const socketService = new SocketService(server, log);

      // @ts-ignore
      const esClient: EsClient = adminCluster.getClient();

      const repoConfigController = new RepositoryConfigController(esClient);
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
      userRoute(server, serverOptions);
      installRoute(server, socketService, lspService, installManager, serverOptions);
      lspRoute(server, lspService, serverOptions);
    },
  });
