/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  IClusterClient,
  SavedObjectsServiceStart,
} from 'kibana/server';
import { TelemetryCollectionManagerPluginSetup } from 'src/plugins/telemetry_collection_manager/server';
import { getClusterUuids, getLocalLicense } from '../../../../src/plugins/telemetry/server';
import { getStatsWithXpack } from './telemetry_collection';

interface TelemetryCollectionXpackDepsSetup {
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

export class TelemetryCollectionXpackPlugin implements Plugin {
  private elasticsearchClient?: IClusterClient;
  private savedObjectsService?: SavedObjectsServiceStart;
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { telemetryCollectionManager }: TelemetryCollectionXpackDepsSetup) {
    telemetryCollectionManager.setCollection({
      esCluster: core.elasticsearch.legacy.client,
      esClientGetter: () => this.elasticsearchClient,
      soServiceGetter: () => this.savedObjectsService,
      title: 'local_xpack',
      priority: 1,
      statsGetter: getStatsWithXpack,
      clusterDetailsGetter: getClusterUuids,
      licenseGetter: getLocalLicense,
    });
  }

  public start(core: CoreStart) {
    this.elasticsearchClient = core.elasticsearch.client;
    this.savedObjectsService = core.savedObjects;
  }
}
