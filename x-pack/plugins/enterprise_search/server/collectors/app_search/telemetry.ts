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
    setup_guide: number;
    engines_overview: number;
  };
  ui_error: {
    cannot_connect: number;
  };
  ui_clicked: {
    create_first_engine_button: number;
    header_launch_button: number;
    engine_table_link: number;
  };
}

export const AS_TELEMETRY_NAME = 'app_search_telemetry';

/**
 * Register the telemetry collector
 */

export const registerTelemetryUsageCollector = (
  usageCollection: UsageCollectionSetup,
  savedObjects: SavedObjectsServiceStart,
  log: Logger
) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<ITelemetry>({
    type: 'app_search',
    fetch: async () => fetchTelemetryMetrics(savedObjects, log),
    isReady: () => true,
    schema: {
      ui_viewed: {
        setup_guide: { type: 'long' },
        engines_overview: { type: 'long' },
      },
      ui_error: {
        cannot_connect: { type: 'long' },
      },
      ui_clicked: {
        create_first_engine_button: { type: 'long' },
        header_launch_button: { type: 'long' },
        engine_table_link: { type: 'long' },
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
    AS_TELEMETRY_NAME,
    savedObjectsRepository,
    log
  );

  const defaultTelemetrySavedObject: ITelemetry = {
    ui_viewed: {
      setup_guide: 0,
      engines_overview: 0,
    },
    ui_error: {
      cannot_connect: 0,
    },
    ui_clicked: {
      create_first_engine_button: 0,
      header_launch_button: 0,
      engine_table_link: 0,
    },
  };

  // If we don't have an existing/saved telemetry object, return the default
  if (!savedObjectAttributes) {
    return defaultTelemetrySavedObject;
  }

  return {
    ui_viewed: {
      setup_guide: get(savedObjectAttributes, 'ui_viewed.setup_guide', 0),
      engines_overview: get(savedObjectAttributes, 'ui_viewed.engines_overview', 0),
    },
    ui_error: {
      cannot_connect: get(savedObjectAttributes, 'ui_error.cannot_connect', 0),
    },
    ui_clicked: {
      create_first_engine_button: get(
        savedObjectAttributes,
        'ui_clicked.create_first_engine_button',
        0
      ),
      header_launch_button: get(savedObjectAttributes, 'ui_clicked.header_launch_button', 0),
      engine_table_link: get(savedObjectAttributes, 'ui_clicked.engine_table_link', 0),
    },
  } as ITelemetry;
};
