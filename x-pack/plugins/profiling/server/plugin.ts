/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { LogLevelId } from '@kbn/logging';
import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import Path from 'path';
import Piscina from 'piscina';
import { MessageChannel } from 'worker_threads';
import agent from 'elastic-apm-node';
import { ProfilingConfig } from '.';
import { PROFILING_FEATURE } from './feature';
import { registerRoutes } from './routes';
import { getFlameGraph } from './routes/get_flamegraph';
import type {
  ProfilingPluginSetup,
  ProfilingPluginSetupDeps,
  ProfilingPluginStart,
  ProfilingPluginStartDeps,
  ProfilingRequestHandlerContext,
  WorkerFlameGraphOptions,
} from './types';
import {
  createProfilingEsClientFromRequest,
  getAbortSignalFromRequest,
} from './utils/create_profiling_es_client';

export class ProfilingPlugin
  implements
    Plugin<
      ProfilingPluginSetup,
      ProfilingPluginStart,
      ProfilingPluginSetupDeps,
      ProfilingPluginStartDeps
    >
{
  private readonly logger: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext<ProfilingConfig>) {
    this.initializerContext = initializerContext;
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup<ProfilingPluginStartDeps>, deps: ProfilingPluginSetupDeps) {
    this.logger.debug('profiling: Setup');
    const router = core.http.createRouter<ProfilingRequestHandlerContext>();

    deps.features.registerKibanaFeature(PROFILING_FEATURE);

    const config = this.initializerContext.config.get();

    let piscina: Piscina | undefined;

    if (config.workers.min > 0 && config.elasticsearch) {
      piscina = new Piscina({
        minThreads: config.workers.min,
        maxThreads: config.workers.max,
        filename: Path.join(__dirname, '../scripts/worker.js'),
        env: {
          ...process.env,
          ELASTIC_APM_SERVICE_NAME: 'kibana-profiling-worker',
        },
      });
    }

    core.getStartServices().then(([coreStart, depsStart]) => {
      const profilingSpecificEsClient = config.elasticsearch
        ? coreStart.elasticsearch.createClient('profiling', {
            hosts: [config.elasticsearch.hosts],
            username: config.elasticsearch.username,
            password: config.elasticsearch.password,
          })
        : undefined;

      function createProfilingEsClient({
        request,
        esClient: defaultEsClient,
      }: {
        request: KibanaRequest;
        esClient: ElasticsearchClient;
      }) {
        const esClient = profilingSpecificEsClient
          ? profilingSpecificEsClient.asScoped(request).asInternalUser
          : defaultEsClient;

        return createProfilingEsClientFromRequest({ request, esClient });
      }

      registerRoutes({
        router,
        logger: this.logger!,
        dependencies: {
          start: depsStart,
          setup: deps,
        },
        services: {
          getFlameGraph: async ({ timeFrom, timeTo, kuery, context, request, logger }) => {
            if (piscina) {
              const messageChannel = new MessageChannel();
              messageChannel.port2.on(
                'message',
                ({
                  level,
                  args,
                }: {
                  level: Exclude<LogLevelId, 'all' | 'off'>;
                  args: [string, any];
                }) => {
                  logger[level](...args);
                }
              );

              const options: WorkerFlameGraphOptions = {
                timeFrom,
                timeTo,
                kuery,
                port: messageChannel!.port1,
                childOf: agent.currentTraceparent!,
                ...config.elasticsearch!,
              };

              return piscina.run(options, {
                name: 'getFlameGraph',
                signal: getAbortSignalFromRequest(request),
                transferList: [messageChannel!.port1],
              });
            }

            return getFlameGraph({
              client: createProfilingEsClient({
                request,
                esClient: (await context.core).elasticsearch.client.asCurrentUser,
              }),
              kuery,
              timeFrom,
              timeTo,
              logger,
            });
          },
          createProfilingEsClient,
        },
      });
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('profiling: Started');
    return {};
  }

  public stop() {}
}
