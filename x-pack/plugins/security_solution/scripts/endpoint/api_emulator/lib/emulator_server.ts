/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import Hapi from '@hapi/hapi';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  EmulatorServerPlugin,
  EmulatorServerPluginRegisterOptions,
} from './emulator_server.types';
import type { DeferredPromiseInterface } from '../../common/utils';
import { getDeferredPromise, prefixedOutputLogger } from '../../common/utils';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';

interface EmulatorServerOptions {
  services?: Record<string, any>;
  logger?: ToolingLog;
  logPrefix?: string;
  port?: number;
}

export class EmulatorServer {
  protected readonly server: Hapi.Server;
  protected log: ToolingLog;
  private stoppedDeferred: DeferredPromiseInterface;
  private wasStarted: boolean = false;

  constructor(protected readonly options: EmulatorServerOptions = {}) {
    this.log = prefixedOutputLogger(
      (this.options.logPrefix || this.constructor.name) ?? 'EmulatorServer',
      options.logger ?? createToolingLogger()
    );

    this.server = Hapi.server({
      port: this.options.port ?? 0,
    });
    this.server.app.services = this.options.services ?? {};
    this.stoppedDeferred = getDeferredPromise();
    this.stoppedDeferred.resolve();

    this.server.events.on('route', (route) => {
      this.log.info(
        `added route: [${route.realm.plugin ?? 'CORE'}] ${route.method.toUpperCase()} ${route.path}`
      );
    });

    this.registerInternalRoutes();
    this.log.verbose(`Instance created`);
  }

  protected registerInternalRoutes() {
    this.server.route({
      method: 'GET',
      path: '/_status',
      handler: async (req) => ({
        status: 'ok',
        started: new Date(req.server.info.started).toISOString(),
        uri: req.server.info.uri,
        plugins: Object.keys(req.server.registrations),
        routes: req.server.table().map((route) => `${route.method.toUpperCase()} ${route.path}`),
      }),
    });
  }

  /**
   * Returns a promise that resolves when the server is stopped
   */
  public get stopped(): Promise<void> {
    if (!this.wasStarted) {
      this.log.warning(`Can not access 'stopped' promise. Server not started`);
      return Promise.resolve();
    }

    return this.stoppedDeferred.promise;
  }

  public async register({ register, prefix, ...options }: EmulatorServerPlugin) {
    await this.server.register(
      {
        register(server) {
          const scopedServer: EmulatorServerPluginRegisterOptions = {
            router: {
              route: (...args) => {
                return server.route(...args);
              },
            },
          };

          return register(scopedServer);
        },
        ...options,
      },
      {
        routes: {
          // All plugin routes are namespaced by `prefix` or the plugin name if `prefix` not defined
          prefix: prefix || `/${options.name}`,
        },
      }
    );
  }

  public route() {
    // TODO:PT implememnt
  }

  public async start() {
    if (this.wasStarted) {
      this.log.warning(`Can not start server - it already has been started and is running`);
    }

    this.stoppedDeferred = getDeferredPromise();
    await this.server.start();
    this.wasStarted = true;

    this.server.events.once('stop', () => {
      this.log.verbose(`Hapi server was stopped!`);
      this.wasStarted = false;
      this.stoppedDeferred.resolve();
    });

    this.log.debug(`Server started and available at: ${this.server.info.uri}`);
  }

  public async stop() {
    this.log.debug(`Stopping Hapi server: ${this.server.info.uri}`);
    await this.server.stop();
  }
}
