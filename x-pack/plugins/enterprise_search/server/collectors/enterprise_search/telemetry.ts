/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { SavedObjectsServiceStart, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { getSavedObjectAttributesFromRepo } from '../lib/telemetry';

interface ITelemetry {
  ui_viewed: {
    overview: number;
  };
  ui_clicked: {
    app_search: number;
    workplace_search: number;
  };
}

export const ES_TELEMETRY_NAME = 'enterprise_search_telemetry';

/**
 * Register the telemetry collector
 */

export const registerTelemetryUsageCollector = (
  usageCollection: UsageCollectionSetup,
  savedObjects: SavedObjectsServiceStart,
  log: Logger
) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<ITelemetry>({
    type: 'enterprise_search',
    fetch: async () => fetchTelemetryMetrics(savedObjects, log),
    isReady: () => true,
    schema: {
      ui_viewed: {
        overview: { type: 'long' },
      },
      ui_clicked: {
        app_search: { type: 'long' },
        workplace_search: { type: 'long' },
      },
    },
  });
  usageCollection.registerCollector(telemetryUsageCollector);
};

/**
 * Fetch the aggregated telemetry metrics from our saved objects
 */

const fetchTelemetryMetrics = async (savedObjects: SavedObjectsServiceStart, log: Logger) => {
  const savedObjectsRepository = savedObjects.createInternalRepository();
  const savedObjectAttributes = await getSavedObjectAttributesFromRepo(
    ES_TELEMETRY_NAME,
    savedObjectsRepository,
    log
  );

  const defaultTelemetrySavedObject: ITelemetry = {
    ui_viewed: {
      overview: 0,
    },
    ui_clicked: {
      app_search: 0,
      workplace_search: 0,
    },
  };

  // If we don't have an existing/saved telemetry object, return the default
  if (!savedObjectAttributes) {
    return defaultTelemetrySavedObject;
  }

  return {
    ui_viewed: {
      overview: get(savedObjectAttributes, 'ui_viewed.overview', 0),
    },
    ui_clicked: {
      app_search: get(savedObjectAttributes, 'ui_clicked.app_search', 0),
      workplace_search: get(savedObjectAttributes, 'ui_clicked.workplace_search', 0),
    },
  } as ITelemetry;
};
