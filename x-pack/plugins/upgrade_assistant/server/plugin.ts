/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import {
  Plugin,
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  Logger,
  ElasticsearchServiceSetup,
  SavedObjectsClient,
  SavedObjectsServiceStart,
} from '../../../../src/core/server';

import { CloudSetup } from '../../cloud/server';
import { LicensingPluginSetup } from '../../licensing/server';
import { APMOSSPluginSetup } from '../../../../src/plugins/apm_oss/server';

import { extractIndexPatterns } from './lib/apm/extract_index_patterns';

import { CredentialStore, credentialStoreFactory } from './lib/reindexing/credential_store';
import { ReindexWorker } from './lib/reindexing';
import { registerUpgradeAssistantUsageCollector } from './lib/telemetry';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerQueryDefaultFieldRoutes } from './routes/query_default_field';
import { registerReindexIndicesRoutes, createReindexWorker } from './routes/reindex_indices';
import { registerTelemetryRoutes } from './routes/telemetry';
import { RouteDependencies } from './types';

interface PluginsSetup {
  usageCollection: UsageCollectionSetup;
  licensing: LicensingPluginSetup;
  apm_oss: APMOSSPluginSetup;
  cloud?: CloudSetup;
}

export class UpgradeAssistantServerPlugin implements Plugin {
  private readonly logger: Logger;
  private readonly credentialStore: CredentialStore;

  // Properties set at setup
  private licensing?: LicensingPluginSetup;
  private elasticSearchService?: ElasticsearchServiceSetup;
  private apmOSS?: APMOSSPluginSetup;

  // Properties set at start
  private savedObjectsServiceStart?: SavedObjectsServiceStart;
  private worker?: ReindexWorker;

  constructor({ logger }: PluginInitializerContext) {
    this.logger = logger.get();
    this.credentialStore = credentialStoreFactory();
  }

  private getWorker() {
    if (!this.worker) {
      throw new Error('Worker unavailable');
    }
    return this.worker;
  }

  setup(
    { http, elasticsearch, getStartServices }: CoreSetup,
    { usageCollection, cloud, licensing, apm_oss: apmOSS }: PluginsSetup
  ) {
    this.elasticSearchService = elasticsearch;
    this.licensing = licensing;
    this.apmOSS = apmOSS;

    const router = http.createRouter();

    const dependencies: RouteDependencies = {
      cloud,
      router,
      apmOSS,
      credentialStore: this.credentialStore,
      log: this.logger,
      getSavedObjectsService: () => {
        if (!this.savedObjectsServiceStart) {
          throw new Error('Saved Objects Start service not available');
        }
        return this.savedObjectsServiceStart;
      },
      licensing,
    };

    registerClusterCheckupRoutes(dependencies);
    registerDeprecationLoggingRoutes(dependencies);
    registerReindexIndicesRoutes(dependencies, this.getWorker.bind(this));
    // Bootstrap the needed routes and the collector for the telemetry
    registerTelemetryRoutes(dependencies);
    registerQueryDefaultFieldRoutes(dependencies);

    if (usageCollection) {
      getStartServices().then(([{ savedObjects }]) => {
        registerUpgradeAssistantUsageCollector({ elasticsearch, usageCollection, savedObjects });
      });
    }
  }

  async start({ savedObjects }: CoreStart) {
    this.savedObjectsServiceStart = savedObjects;

    // The ReindexWorker uses a map of request headers that contain the authentication credentials
    // for a given reindex. We cannot currently store these in an the .kibana index b/c we do not
    // want to expose these credentials to any unauthenticated users. We also want to avoid any need
    // to add a user for a special index just for upgrading. This in-memory cache allows us to
    // process jobs without the browser staying on the page, but will require that jobs go into
    // a paused state if no Kibana nodes have the required credentials.

    const apmIndexPatterns = extractIndexPatterns(
      await this.apmOSS!.config$.pipe(first()).toPromise()
    );

    this.worker = createReindexWorker({
      credentialStore: this.credentialStore,
      licensing: this.licensing!,
      elasticsearchService: this.elasticSearchService!,
      logger: this.logger,
      savedObjects: new SavedObjectsClient(
        this.savedObjectsServiceStart.createInternalRepository()
      ),
      apmIndexPatterns,
    });

    this.worker!.start();
  }

  stop(): void {
    if (this.worker) {
      this.worker.stop();
    }
  }
}
