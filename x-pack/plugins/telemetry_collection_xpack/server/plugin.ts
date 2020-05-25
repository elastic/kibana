/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'kibana/server';
import { TelemetryCollectionManagerPluginStart } from 'src/plugins/telemetry_collection_manager/server';
import { getClusterUuids, getLocalLicense } from '../../../../src/plugins/telemetry/server';
import { getStatsWithXpack } from './telemetry_collection';

interface TelemetryCollectionXpackDepsStart {
  telemetryCollectionManager: TelemetryCollectionManagerPluginStart;
}

export class TelemetryCollectionXpackPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {}

  public start(core: CoreStart, { telemetryCollectionManager }: TelemetryCollectionXpackDepsStart) {
    telemetryCollectionManager.setCollection({
      esCluster: core.elasticsearch.legacy.client,
      title: 'local_xpack',
      priority: 1,
      statsGetter: getStatsWithXpack,
      clusterDetailsGetter: getClusterUuids,
      licenseGetter: getLocalLicense,
    });
  }
}
