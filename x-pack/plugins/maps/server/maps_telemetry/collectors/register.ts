/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { getMapsTelemetry } from '../maps_telemetry';
// @ts-ignore
import { TELEMETRY_TYPE } from '../../../common/constants';
import { MapsConfigType } from '../../../config';

export function registerMapsUsageCollector(
  usageCollection: UsageCollectionSetup,
  config: MapsConfigType
): void {
  if (!usageCollection) {
    return;
  }

  const mapsUsageCollector = usageCollection.makeUsageCollector({
    type: TELEMETRY_TYPE,
    isReady: () => true,
    fetch: async () => await getMapsTelemetry(config),
  });

  usageCollection.registerCollector(mapsUsageCollector);
}
