/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
  ElasticsearchServiceSetup,
  SavedObjectsClient,
} from 'kibana/server';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ServerShimWithRouter } from './types';
import { CredentialStore, credentialStoreFactory } from './lib/reindexing/credential_store';
import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerReindexIndicesRoutes, createReindexWorker } from './routes/reindex_indices';
import { CloudSetup } from '../../cloud/server';
import { registerTelemetryRoutes } from './routes/telemetry';
import { ReindexWorker } from './lib/reindexing';
import { SecurityPluginSetup } from '../../security/server';

interface PluginsSetup {
  usageCollection: UsageCollectionSetup;
  security: SecurityPluginSetup;
  cloud?: CloudSetup;
}

export class UpgradeAssistantServerPlugin implements Plugin {
  private readonly logger: Logger;
  private worker: ReindexWorker;
  private credentialStore: CredentialStore;

  private security?: SecurityPluginSetup;
  private elasticSearchService: ElasticsearchServiceSetup;

  constructor(ctx: PluginInitializerContext) {
    this.logger = ctx.logger.get();
    this.credentialStore = credentialStoreFactory();
  }

  private getWorker() {
    if (!this.worker) {
      throw new Error('Worker unavailable');
    }
    return this.worker;
  }

  setup(
    { http, elasticsearch, savedObjects }: CoreSetup,
    { usageCollection, cloud, security }: PluginsSetup
  ) {
    this.elasticSearchService = elasticsearch;
    this.security = security;

    const router = http.createRouter();
    const shimWithRouter: ServerShimWithRouter = { ...__LEGACY, router };
    registerClusterCheckupRoutes(shimWithRouter, { cloud });
    registerDeprecationLoggingRoutes(shimWithRouter);
    registerReindexIndicesRoutes(shimWithRouter, this.getWorker.bind(this), this.credentialStore);
    // Bootstrap the needed routes and the collector for the telemetry
    registerTelemetryRoutes(shimWithRouter);
    registerUpgradeAssistantUsageCollector(usageCollection, __LEGACY);
  }

  start({ savedObjects }: CoreStart, plugins: any) {
    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.

    this.worker = createReindexWorker({
      credentialStore: this.credentialStore,
      security: this.security,
      elasticsearchService: this.elasticSearchService,
      logger: this.logger,
      savedObjects: new SavedObjectsClient(savedObjects.createInternalRepository()),
    });

    this.worker.start();
  }

  stop(): void {
    this.worker.stop();
  }
}
