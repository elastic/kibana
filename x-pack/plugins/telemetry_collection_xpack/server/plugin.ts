/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { TelemetryCollectionManagerPluginSetup } from 'src/plugins/telemetry_collection_manager/server';
import { getClusterUuids } from '../../../../src/plugins/telemetry/server';
import { getStatsWithXpack } from './telemetry_collection';

interface TelemetryCollectionXpackDepsSetup {
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

export class TelemetryCollectionXpackPlugin implements Plugin {
  constructor() {}

  public setup(core: CoreSetup, { telemetryCollectionManager }: TelemetryCollectionXpackDepsSetup) {
    telemetryCollectionManager.setCollectionStrategy({
      title: 'local_xpack',
      priority: 1,
      statsGetter: getStatsWithXpack,
      clusterDetailsGetter: getClusterUuids,
    });
  }

  public start(core: CoreStart) {}
}
