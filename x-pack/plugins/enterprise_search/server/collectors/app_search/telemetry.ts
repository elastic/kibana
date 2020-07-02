/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import {
  ISavedObjectsRepository,
  SavedObjectsServiceStart,
  SavedObjectAttributes,
} from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

interface ITelemetry {
  ui_viewed: {
    setup_guide: number;
    engines_overview: number;
  };
  ui_error: {
    cannot_connect: number;
    no_as_account: number;
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
  savedObjects: SavedObjectsServiceStart
) => {
  const telemetryUsageCollector = usageCollection.makeUsageCollector<ITelemetry>({
    type: 'app_search',
    fetch: async () => fetchTelemetryMetrics(savedObjects),
    isReady: () => true,
    schema: {
      ui_viewed: {
        setup_guide: { type: 'long' },
        engines_overview: { type: 'long' },
      },
      ui_error: {
        cannot_connect: { type: 'long' },
        no_as_account: { type: 'long' },
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

const fetchTelemetryMetrics = async (savedObjects: SavedObjectsServiceStart) => {
  const savedObjectsRepository = savedObjects.createInternalRepository();
  const savedObjectAttributes = (await getSavedObjectAttributesFromRepo(
    savedObjectsRepository
  )) as SavedObjectAttributes;

  const defaultTelemetrySavedObject: ITelemetry = {
    ui_viewed: {
      setup_guide: 0,
      engines_overview: 0,
    },
    ui_error: {
      cannot_connect: 0,
      no_as_account: 0,
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

  // Iterate through each attribute key and set its saved values
  const attributeKeys = Object.keys(savedObjectAttributes);
  const telemetryObj = defaultTelemetrySavedObject;
  attributeKeys.forEach((key: string) => {
    set(telemetryObj, key, savedObjectAttributes[key]);
  });

  return telemetryObj as ITelemetry;
};

/**
 * Helper function - fetches saved objects attributes
 */

const getSavedObjectAttributesFromRepo = async (
  savedObjectsRepository: ISavedObjectsRepository
) => {
  try {
    return (await savedObjectsRepository.get(AS_TELEMETRY_NAME, AS_TELEMETRY_NAME)).attributes;
  } catch (e) {
    return null;
  }
};

/**
 * Set saved objection attributes - used by telemetry route
 */

interface IIncrementUICounter {
  savedObjects: SavedObjectsServiceStart;
  uiAction: string;
  metric: string;
}

export async function incrementUICounter({ savedObjects, uiAction, metric }: IIncrementUICounter) {
  const internalRepository = savedObjects.createInternalRepository();

  await internalRepository.incrementCounter(
    AS_TELEMETRY_NAME,
    AS_TELEMETRY_NAME,
    `${uiAction}.${metric}` // e.g., ui_viewed.setup_guide
  );

  return { success: true };
}
